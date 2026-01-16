import type { DestinyProfileResponse, InventoryItem } from '@/api/inventory'
import type { WeaponInstance } from '@/models/weapon-instance'
import { WEAPON_BUCKET_HASHES, TierType, ItemType } from '@/utils/constants'
import { manifestService } from './manifest-service'

/**
 * Parse weapons from Destiny profile response
 */
export class WeaponParser {
  /**
   * Extract all weapon instances from profile
   */
  parseWeapons(profile: DestinyProfileResponse): WeaponInstance[] {
    const weapons: WeaponInstance[] = []
    const allItems: InventoryItem[] = []

    // Collect items from vault (profile inventory)
    if (profile.profileInventory?.data?.items) {
      allItems.push(...profile.profileInventory.data.items)
    }

    // Collect items from character inventories
    if (profile.characterInventories?.data) {
      for (const characterId in profile.characterInventories.data) {
        const characterInventory = profile.characterInventories.data[characterId]
        if (characterInventory.items) {
          allItems.push(...characterInventory.items)
        }
      }
    }

    // Collect items from character equipment
    if (profile.characterEquipment?.data) {
      for (const characterId in profile.characterEquipment.data) {
        const characterEquipment = profile.characterEquipment.data[characterId]
        if (characterEquipment.items) {
          allItems.push(...characterEquipment.items)
        }
      }
    }

    for (const item of allItems) {
      // Check if item is in a weapon bucket
      const isWeapon = Object.values(WEAPON_BUCKET_HASHES).includes(item.bucketHash)
      if (!isWeapon || !item.itemInstanceId) {
        continue
      }

      // Get weapon definition to check if it's legendary
      const weaponDef = manifestService.getInventoryItem(item.itemHash)

      if (!weaponDef) {
        continue
      }

      // Filter for legendary weapons (and exotic for testing)
      const tierType = weaponDef.inventory?.tierType
      if (tierType !== TierType.Superior && tierType !== TierType.Exotic) {
        continue
      }

      // Only include actual weapons
      if (weaponDef.itemType !== ItemType.Weapon) {
        continue
      }

      // Get socket data for this instance
      const socketData = profile.itemComponents?.sockets?.data?.[item.itemInstanceId]
      const reusablePlugs = profile.itemComponents?.reusablePlugs?.data?.[item.itemInstanceId]
      const instanceData = profile.itemComponents?.instances?.data?.[item.itemInstanceId]

      if (!socketData || !socketData.sockets) {
        continue
      }

      // Get gear tier from instance data (1-5, or null for pre-9.0.0 items)
      const gearTier = instanceData?.gearTier

      // Create weapon instance
      const socketPlugsByIndex: Record<number, number[]> = {}

      if (reusablePlugs?.plugs) {
        const { plugs } = reusablePlugs

        if (Array.isArray(plugs)) {
          for (const plug of plugs) {
            if (!socketPlugsByIndex[plug.socketIndex]) {
              socketPlugsByIndex[plug.socketIndex] = []
            }
            socketPlugsByIndex[plug.socketIndex].push(plug.plugItemHash)
          }
        } else {
          for (const [socketIndexKey, socketPlugs] of Object.entries(plugs)) {
            if (!Array.isArray(socketPlugs)) continue
            const socketIndex = Number(socketIndexKey)
            if (!Number.isFinite(socketIndex)) continue
            if (!socketPlugsByIndex[socketIndex]) {
              socketPlugsByIndex[socketIndex] = []
            }
            for (const plug of socketPlugs) {
              if (plug?.plugItemHash) {
                socketPlugsByIndex[socketIndex].push(plug.plugItemHash)
              }
            }
          }
        }
      }

      const weaponInstance: WeaponInstance = {
        itemInstanceId: item.itemInstanceId,
        itemHash: item.itemHash,
        sockets: {
          sockets: socketData.sockets.map(socket => ({
            plugHash: socket.plugHash || 0,
            isEnabled: socket.isEnabled
          }))
        },
        socketPlugsByIndex: Object.keys(socketPlugsByIndex).length ? socketPlugsByIndex : undefined,
        gearTier,
        isHolofoil: manifestService.isHolofoilWeapon(item.itemHash)
      }

      weapons.push(weaponInstance)
    }

    return weapons
  }

  /**
   * Group weapons by hash (for deduplication)
   * @deprecated Use groupWeaponsByNameAndSeason instead for holofoil variant support
   */
  groupWeaponsByHash(weapons: WeaponInstance[]): Map<number, WeaponInstance[]> {
    const grouped = new Map<number, WeaponInstance[]>()

    for (const weapon of weapons) {
      if (!grouped.has(weapon.itemHash)) {
        grouped.set(weapon.itemHash, [])
      }
      grouped.get(weapon.itemHash)!.push(weapon)
    }

    return grouped
  }

  /**
   * Group weapons by name + season number (combines holofoil variants and different watermark images)
   * Returns Map<groupKey, WeaponInstance[]> where groupKey is derived from name + season
   */
  groupWeaponsByNameAndSeason(weapons: WeaponInstance[]): Map<string, WeaponInstance[]> {
    const grouped = new Map<string, WeaponInstance[]>()

    for (const weapon of weapons) {
      const name = this.getWeaponName(weapon.itemHash)
      const watermark = this.getWeaponIconWatermark(weapon.itemHash)
      // Convert watermark to season number for consistent grouping
      // This handles cases where same-season weapons have different watermark images
      const season = manifestService.getSeasonFromWatermark(watermark) ?? 0

      // Group by name + season number (not watermark path)
      const groupKey = `${name}|season-${season}`

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, [])
      }
      grouped.get(groupKey)!.push(weapon)
    }

    return grouped
  }

  /**
   * Get weapon name from hash
   */
  getWeaponName(itemHash: number): string {
    const weaponDef = manifestService.getInventoryItem(itemHash)
    return weaponDef?.displayProperties?.name || `Unknown Weapon (${itemHash})`
  }

  /**
   * Get weapon icon from hash
   */
  getWeaponIcon(itemHash: number): string {
    const weaponDef = manifestService.getInventoryItem(itemHash)
    return weaponDef?.displayProperties?.icon || ''
  }

  /**
   * Get weapon type display name (e.g., "Hand Cannon", "Auto Rifle")
   */
  getWeaponType(itemHash: number): string {
    const weaponDef = manifestService.getInventoryItem(itemHash)
    return weaponDef?.itemTypeDisplayName || 'Weapon'
  }

  /**
   * Get weapon tier type (rarity): 6 = Exotic, 5 = Legendary
   */
  getWeaponTierType(itemHash: number): number {
    const weaponDef = manifestService.getInventoryItem(itemHash)
    return weaponDef?.inventory?.tierType || 0
  }

  /**
   * Get weapon icon watermark (season/version badge overlay)
   * Returns the version-specific watermark if available, otherwise the base watermark
   */
  getWeaponIconWatermark(itemHash: number): string | undefined {
    const weaponDef = manifestService.getInventoryItem(itemHash)
    if (!weaponDef) return undefined

    // Check for version-specific watermark first (for reissued weapons)
    const versionWatermarks = weaponDef.quality?.displayVersionWatermarkIcons
    const currentVersion = weaponDef.quality?.currentVersion
    if (versionWatermarks?.length && currentVersion !== undefined) {
      const versionWatermark = versionWatermarks[currentVersion]
      if (versionWatermark) return versionWatermark
    }

    // Fall back to the base watermark
    return weaponDef.iconWatermark || undefined
  }

  /**
   * Get weapon season display name (e.g., "Season 28")
   * Uses DIM's watermark-to-season mapping since Bungie's JSON manifest
   * doesn't include seasonHash on weapon definitions
   */
  getWeaponSeasonName(itemHash: number): string | undefined {
    const watermark = this.getWeaponIconWatermark(itemHash)
    const seasonNumber = manifestService.getSeasonFromWatermark(watermark)

    if (seasonNumber === undefined) {
      return undefined
    }

    return `Season ${seasonNumber}`
  }
}

export const weaponParser = new WeaponParser()
