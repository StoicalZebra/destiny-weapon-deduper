import { indexedDBStorage } from '@/utils/storage'
import type { ManifestTableName } from '@/utils/constants'

/**
 * Generic manifest definition interface
 */
export interface ManifestDefinition {
  hash: number
  index: number
  redacted: boolean
  [key: string]: any
}

/**
 * Inventory item definition (weapons, armor, etc.)
 */
export interface DestinyInventoryItemDefinition extends ManifestDefinition {
  displayProperties: {
    name: string
    description: string
    icon: string
    hasIcon: boolean
  }
  itemTypeDisplayName: string
  itemType: number
  itemSubType: number
  // Watermark overlays for season/version indicators
  iconWatermark?: string
  iconWatermarkShelved?: string
  // Season association
  seasonHash?: number
  // Quality block with version-specific watermarks
  quality?: {
    displayVersionWatermarkIcons?: string[]
    currentVersion?: number
  }
  inventory?: {
    tierType: number
    tierTypeName: string
    bucketTypeHash: number
  }
  sockets?: {
    socketEntries: Array<{
      socketTypeHash: number
      singleInitialItemHash: number
      reusablePlugSetHash?: number
      randomizedPlugSetHash?: number
      plugSources: number
    }>
    socketCategories: Array<{
      socketCategoryHash: number
      socketIndexes: number[]
    }>
  }
  stats?: {
    stats: Record<number, {
      statHash: number
      value: number
    }>
  }
}

/**
 * Plug set definition (perk options for sockets)
 */
export interface DestinyPlugSetDefinition extends ManifestDefinition {
  displayProperties: {
    name: string
    description: string
  }
  reusablePlugItems: Array<{
    plugItemHash: number
    /**
     * Whether this perk can currently roll on new drops.
     * If false, this perk was available in past seasons but can no longer be obtained.
     */
    currentlyCanRoll?: boolean
    craftingRequirements?: any
  }>
}

/**
 * Bidirectional mapping between base and enhanced trait hashes
 */
interface TraitMapping {
  baseToEnhanced: Map<number, number>
  enhancedToBase: Map<number, number>
}

/**
 * Service for looking up manifest definitions
 */
class ManifestService {
  private cache: Map<ManifestTableName, Record<string, any>> = new Map()
  private traitMapping: TraitMapping | null = null

  /**
   * Load a manifest table into memory cache
   */
  async loadTable(tableName: ManifestTableName): Promise<void> {
    if (this.cache.has(tableName)) {
      return // Already loaded
    }

    const data = await indexedDBStorage.getManifestTable(tableName)

    if (!data) {
      throw new Error(`Manifest table ${tableName} not found in storage`)
    }

    this.cache.set(tableName, data)
  }

  /**
   * Load all tables into memory cache
   */
  async loadAllTables(tables: ManifestTableName[]): Promise<void> {
    await Promise.all(tables.map(table => this.loadTable(table)))
  }

  /**
   * Get a definition by hash
   * Bungie uses signed 32-bit integers, but JavaScript bitwise operations convert to signed,
   * so we need to handle both positive and negative hash values
   */
  getDefinition<T = ManifestDefinition>(
    tableName: ManifestTableName,
    hash: number
  ): T | null {
    const table = this.cache.get(tableName)

    if (!table) {
      console.warn(`Table ${tableName} not loaded`)
      return null
    }

    // Try the hash as-is first
    let definition = table[hash]

    // If not found, try converting between signed/unsigned
    if (!definition) {
      // Convert unsigned to signed (or vice versa)
      const alternateHash = hash < 0 ? hash >>> 0 : hash | 0
      definition = table[alternateHash]
    }

    return definition || null
  }

  /**
   * Get inventory item definition (weapon, armor, etc.)
   */
  getInventoryItem(hash: number): DestinyInventoryItemDefinition | null {
    return this.getDefinition<DestinyInventoryItemDefinition>(
      'DestinyInventoryItemDefinition',
      hash
    )
  }

  /**
   * Get plug set definition (perk options)
   */
  getPlugSet(hash: number): DestinyPlugSetDefinition | null {
    return this.getDefinition<DestinyPlugSetDefinition>(
      'DestinyPlugSetDefinition',
      hash
    )
  }

  /**
   * Clear memory cache and trait mapping
   */
  clearCache(): void {
    this.cache.clear()
    this.traitMapping = null
  }

  /**
   * Check if a table is loaded
   */
  isTableLoaded(tableName: ManifestTableName): boolean {
    return this.cache.has(tableName)
  }

  /**
   * Build the global trait-to-enhanced-trait mapping by scanning all plug sets.
   * This is called once after manifest tables are loaded.
   *
   * The algorithm matches base and enhanced perks by:
   * 1. Scanning all plug sets for perks
   * 2. Separating perks by tier type (Basic = base, Common = enhanced)
   * 3. Matching by display name (exact match or base name + " Enhanced")
   */
  buildTraitMapping(): void {
    if (this.traitMapping) {
      return // Already built
    }

    const baseToEnhanced = new Map<number, number>()
    const enhancedToBase = new Map<number, number>()

    const plugSetTable = this.cache.get('DestinyPlugSetDefinition')
    if (!plugSetTable) {
      console.warn('PlugSet table not loaded, cannot build trait mapping')
      this.traitMapping = { baseToEnhanced, enhancedToBase }
      return
    }

    // Iterate all plug sets
    for (const plugSetHash of Object.keys(plugSetTable)) {
      const plugSet = plugSetTable[plugSetHash] as DestinyPlugSetDefinition
      if (!plugSet?.reusablePlugItems) continue

      const basicTraits: Array<{ hash: number; name: string }> = []
      const enhancedTraits: Array<{ hash: number; name: string }> = []

      // Separate perks by tier type
      for (const plugItem of plugSet.reusablePlugItems) {
        const def = this.getInventoryItem(plugItem.plugItemHash)
        if (!def) continue

        const tierType = def.inventory?.tierType
        const name = def.displayProperties?.name
        if (!name) continue

        // TierType 2 = Basic (base trait), TierType 3 = Common (enhanced trait)
        if (tierType === 2) {
          basicTraits.push({ hash: plugItem.plugItemHash, name })
        } else if (tierType === 3) {
          enhancedTraits.push({ hash: plugItem.plugItemHash, name })
        }
      }

      // Match enhanced traits to base traits by name
      for (const enhanced of enhancedTraits) {
        // Look for exact name match or legacy "Name Enhanced" format
        const base = basicTraits.find(
          (b) => b.name === enhanced.name || enhanced.name === b.name + ' Enhanced'
        )

        if (base && !baseToEnhanced.has(base.hash)) {
          baseToEnhanced.set(base.hash, enhanced.hash)
          enhancedToBase.set(enhanced.hash, base.hash)
        }
      }
    }

    this.traitMapping = { baseToEnhanced, enhancedToBase }
  }

  /**
   * Get the enhanced variant hash for a base perk
   */
  getEnhancedVariant(baseHash: number): number | undefined {
    return this.traitMapping?.baseToEnhanced.get(baseHash)
  }

  /**
   * Get the base variant hash for an enhanced perk
   */
  getBaseVariant(enhancedHash: number): number | undefined {
    return this.traitMapping?.enhancedToBase.get(enhancedHash)
  }

  /**
   * Check if the trait mapping has been built
   */
  isTraitMappingBuilt(): boolean {
    return this.traitMapping !== null
  }

  /**
   * Get the size of the trait mapping (for debugging/stats)
   */
  getTraitMappingSize(): number {
    return this.traitMapping?.baseToEnhanced.size ?? 0
  }
}

export const manifestService = new ManifestService()
