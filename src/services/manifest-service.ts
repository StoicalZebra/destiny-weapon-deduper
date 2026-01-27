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
   * Pre-computed map of weapon hash → all variant hashes for that weapon
   * Built once when DestinyInventoryItemDefinition is loaded
   * Key: any weapon hash, Value: array of all hashes for same weapon (same name + season)
   */
  private variantGroups: Map<number, number[]> = new Map()

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

    // Build variant groups when inventory items are loaded
    if (tableName === 'DestinyInventoryItemDefinition') {
      this.buildVariantGroups(data as Record<string, DestinyInventoryItemDefinition>)
    }
  }

  /**
   * Build the pre-computed variant groups map
   * Groups weapons by name + season/watermark to find all hash variants
   */
  private buildVariantGroups(table: Record<string, DestinyInventoryItemDefinition>): void {
    // First pass: group weapons by name + season/watermark key
    const groupsByKey = new Map<string, number[]>()

    for (const key in table) {
      const def = table[key]
      if (!def?.displayProperties?.name) continue
      if (def.itemType !== 3) continue // Only weapons

      const name = def.displayProperties.name
      const watermark = def.iconWatermark || def.quality?.displayVersionWatermarkIcons?.[0]
      const seasonHash = def.seasonHash

      // Create a grouping key from name + season/watermark
      // Prefer seasonHash if available, fall back to watermark
      const groupKey = seasonHash
        ? `${name}|season:${seasonHash}`
        : watermark
          ? `${name}|watermark:${watermark}`
          : `${name}|none`

      const hash = typeof def.hash === 'number' ? def.hash : parseInt(key)

      if (!groupsByKey.has(groupKey)) {
        groupsByKey.set(groupKey, [])
      }
      groupsByKey.get(groupKey)!.push(hash)
    }

    // Second pass: populate variantGroups map (hash → all hashes in group)
    this.variantGroups.clear()
    let multiVariantCount = 0

    for (const hashes of groupsByKey.values()) {
      if (hashes.length > 1) {
        multiVariantCount++
      }
      // Map each hash to the full group
      for (const hash of hashes) {
        this.variantGroups.set(hash, hashes)
      }
    }

    console.log(`[ManifestService] Built variant groups: ${multiVariantCount} weapons with multiple variants`)
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
   * Uses pre-computed variant groups built during manifest load for O(1) lookup
   * Returns array of hashes including the input hash
   *
   * IMPORTANT: This groups by name + season/watermark, so it does NOT catch all
   * variants of a weapon. Event weapons (e.g., Dawning holofoils) have different
   * watermarks than their normal versions and won't be grouped together.
   *
   * For UI consolidation where you want ALL versions of a weapon grouped together
   * regardless of season/event, use `groupItemsByWeaponName()` from
   * `src/utils/wishlist-consolidation.ts` instead.
   */
  getWeaponVariantHashes(hash: number): number[] {
    // Use pre-computed map for O(1) lookup
    const variants = this.variantGroups.get(hash)
    if (variants) {
      return variants
    }

    // Fallback: return just the input hash if not in map
    // (happens if manifest not loaded or hash not a weapon)
    return [hash]
  }

  /**
   * Get all weapon hashes that share the same name (ignoring season/watermark).
   * This catches ALL variants including holofoils which have different watermarks.
   * Use this when you need to merge perk options across all versions of a weapon.
   */
  getAllHashesForWeaponName(weaponName: string): number[] {
    const table = this.cache.get('DestinyInventoryItemDefinition')
    if (!table) return []

    const hashes: number[] = []
    for (const key in table) {
      const def = table[key] as DestinyInventoryItemDefinition
      if (def?.displayProperties?.name === weaponName && def.itemType === 3) {
        const hash = typeof def.hash === 'number' ? def.hash : parseInt(key)
        hashes.push(hash)
      }
    }
    return hashes
  }

  /**
   * Get all legendary and exotic weapons from the manifest.
   * Used for browsing all weapons regardless of ownership.
   * Returns an array of weapon definitions sorted by name.
   */
  getAllWeapons(): DestinyInventoryItemDefinition[] {
    const table = this.cache.get('DestinyInventoryItemDefinition')
    if (!table) return []

    const weapons: DestinyInventoryItemDefinition[] = []
    const seenNames = new Set<string>()

    for (const key in table) {
      const def = table[key] as DestinyInventoryItemDefinition
      if (!def?.displayProperties?.name) continue

      // Must be a weapon (itemType 3)
      if (def.itemType !== 3) continue

      // Only legendary (5) or exotic (6) tiers
      const tierType = def.inventory?.tierType
      if (tierType !== 5 && tierType !== 6) continue

      // Skip redacted items
      if (def.redacted) continue

      // Skip holofoil variants (just keep the base version to avoid duplicates)
      if (def.isHolofoil) continue

      // De-duplicate by name + season to avoid showing multiple hashes of the same weapon
      const watermark = def.iconWatermark || def.quality?.displayVersionWatermarkIcons?.[0]
      const dedupeKey = `${def.displayProperties.name}|${def.seasonHash || watermark || 'none'}`
      if (seenNames.has(dedupeKey)) continue
      seenNames.add(dedupeKey)

      weapons.push(def)
    }

    // Sort by name for consistent display
    weapons.sort((a, b) =>
      a.displayProperties.name.localeCompare(b.displayProperties.name)
    )

    return weapons
  }

  /**
   * Clear memory cache
   */
  clearCache(): void {
    this.cache.clear()
    this.variantGroups.clear()
  }

  /**
   * Check if a table is loaded
   */
  isTableLoaded(tableName: ManifestTableName): boolean {
    return this.cache.has(tableName)
  }
}

export const manifestService = new ManifestService()
