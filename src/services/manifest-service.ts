import { indexedDBStorage } from '@/utils/storage'
import type { ManifestTableName } from '@/utils/constants'
import watermarkToSeason from '@/data/watermark-to-season.json'

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
  // Holofoil variant indicator (cosmetic shiny variant)
  isHolofoil?: boolean
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
 * Season definition
 */
export interface DestinySeasonDefinition extends ManifestDefinition {
  displayProperties: {
    name: string
    description: string
    hasIcon: boolean
    icon?: string
  }
  seasonNumber: number
  startDate?: string
  endDate?: string
}

/**
 * Service for looking up manifest definitions
 */
class ManifestService {
  private cache: Map<ManifestTableName, Record<string, any>> = new Map()

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
   * Get season definition
   */
  getSeason(hash: number): DestinySeasonDefinition | null {
    return this.getDefinition<DestinySeasonDefinition>(
      'DestinySeasonDefinition',
      hash
    )
  }

  /**
   * Get season number from watermark icon path
   * Uses DIM's watermark-to-season mapping
   */
  getSeasonFromWatermark(watermark: string | undefined): number | undefined {
    if (!watermark) return undefined
    return (watermarkToSeason as Record<string, number>)[watermark]
  }

  /**
   * Check if a weapon is a holofoil (shiny cosmetic) variant
   */
  isHolofoilWeapon(hash: number): boolean {
    const def = this.getInventoryItem(hash)
    return def?.isHolofoil === true
  }

  /**
   * Find all variant hashes for a weapon (same name + season, different hashes)
   * Used to ensure wishlist rolls are saved to ALL possible variants
   * Returns array of hashes including the input hash
   */
  getWeaponVariantHashes(hash: number): number[] {
    const table = this.cache.get('DestinyInventoryItemDefinition') as Record<string, DestinyInventoryItemDefinition> | undefined
    if (!table) return [hash]

    const sourceDef = this.getInventoryItem(hash)
    if (!sourceDef) return [hash]

    const sourceName = sourceDef.displayProperties?.name
    const sourceWatermark = sourceDef.iconWatermark || sourceDef.quality?.displayVersionWatermarkIcons?.[0]
    const sourceSeason = sourceDef.seasonHash

    if (!sourceName) return [hash]

    // Find all items with matching name and season/watermark
    const variants: number[] = []

    for (const key in table) {
      const def = table[key]
      if (!def?.displayProperties?.name) continue

      // Must have same name
      if (def.displayProperties.name !== sourceName) continue

      // Must be a weapon (itemType 3 = weapon)
      if (def.itemType !== 3) continue

      // Must have same season or watermark (to avoid matching different season versions)
      const defWatermark = def.iconWatermark || def.quality?.displayVersionWatermarkIcons?.[0]
      const sameSeason = sourceSeason && def.seasonHash === sourceSeason
      const sameWatermark = sourceWatermark && defWatermark === sourceWatermark

      if (!sameSeason && !sameWatermark) continue

      // Add this variant
      const variantHash = typeof def.hash === 'number' ? def.hash : parseInt(key)
      if (!variants.includes(variantHash)) {
        variants.push(variantHash)
      }
    }

    // Ensure source hash is included
    if (!variants.includes(hash)) {
      variants.push(hash)
    }

    return variants
  }

  /**
   * Clear memory cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Check if a table is loaded
   */
  isTableLoaded(tableName: ManifestTableName): boolean {
    return this.cache.has(tableName)
  }
}

export const manifestService = new ManifestService()
