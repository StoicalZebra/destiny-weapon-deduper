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
      console.log(`[Parser] Vault items: ${profile.profileInventory.data.items.length}`)
      allItems.push(...profile.profileInventory.data.items)
    }

    // Collect items from character inventories
    if (profile.characterInventories?.data) {
      for (const characterId in profile.characterInventories.data) {
        const characterInventory = profile.characterInventories.data[characterId]
        if (characterInventory.items) {
          console.log(`[Parser] Character ${characterId} inventory: ${characterInventory.items.length}`)
          allItems.push(...characterInventory.items)
        }
      }
    }

    // Collect items from character equipment
    if (profile.characterEquipment?.data) {
      for (const characterId in profile.characterEquipment.data) {
        const characterEquipment = profile.characterEquipment.data[characterId]
        if (characterEquipment.items) {
          console.log(`[Parser] Character ${characterId} equipment: ${characterEquipment.items.length}`)
          allItems.push(...characterEquipment.items)
        }
      }
    }

    console.log(`[Parser] Total items collected: ${allItems.length}`)

    // Track all unique bucket hashes to see what we're dealing with
    const bucketHashCounts = new Map<number, number>()
    for (const item of allItems) {
      bucketHashCounts.set(item.bucketHash, (bucketHashCounts.get(item.bucketHash) || 0) + 1)
    }
    console.log(`[Parser] Unique bucket hashes found:`, Array.from(bucketHashCounts.entries()).slice(0, 20))

    let weaponBucketCount = 0
    let hasInstanceIdCount = 0
    let hasDefinitionCount = 0
    let legendaryExoticCount = 0
    let actualWeaponCount = 0

    // Filter and parse weapons
    const missedWeaponBuckets = new Set<number>()

    for (const item of allItems) {
      // Check if item is in a weapon bucket
      const isWeapon = Object.values(WEAPON_BUCKET_HASHES).includes(item.bucketHash)

      if (!isWeapon) {
        // Check if this might be a weapon we're missing
        if (item.itemInstanceId) {
          const def = manifestService.getInventoryItem(item.itemHash)
          if (def?.itemType === ItemType.Weapon) {
            missedWeaponBuckets.add(item.bucketHash)
          }
        }
        continue
      }

      if (!item.itemInstanceId) {
        continue
      }
      weaponBucketCount++
      hasInstanceIdCount++

      // Get weapon definition to check if it's legendary
      const weaponDef = manifestService.getInventoryItem(item.itemHash)

      if (!weaponDef) {
        console.warn(`No definition found for weapon hash ${item.itemHash}`)
        continue
      }
      hasDefinitionCount++

      // Log first few tierTypes to see what we're getting
      if (hasDefinitionCount <= 5) {
        console.log(`[Parser] Sample weapon: ${weaponDef.displayProperties?.name}, tierType: ${weaponDef.inventory?.tierType}, itemType: ${weaponDef.itemType}`)
      }

      // Filter for legendary weapons (and exotic for testing)
      const tierType = weaponDef.inventory?.tierType
      if (tierType !== TierType.Superior && tierType !== TierType.Exotic) {
        continue
      }
      legendaryExoticCount++

      // Only include actual weapons
      if (weaponDef.itemType !== ItemType.Weapon) {
        continue
      }
      actualWeaponCount++

      // Get socket data for this instance
      const socketData = profile.itemComponents?.sockets?.data?.[item.itemInstanceId]
      const reusablePlugs = profile.itemComponents?.reusablePlugs?.data?.[item.itemInstanceId]
      const instanceData = profile.itemComponents?.instances?.data?.[item.itemInstanceId]

      if (!socketData || !socketData.sockets) {
        console.warn(`No socket data for weapon instance ${item.itemInstanceId}`)
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
        gearTier
      }

      weapons.push(weaponInstance)
    }

    console.log(`[Parser] Filter results:`)
    console.log(`  - In weapon buckets: ${weaponBucketCount}`)
    console.log(`  - Has instance ID: ${hasInstanceIdCount}`)
    console.log(`  - Has definition: ${hasDefinitionCount}`)
    console.log(`  - Is legendary/exotic: ${legendaryExoticCount}`)
    console.log(`  - Is actual weapon: ${actualWeaponCount}`)
    console.log(`  - Final weapons parsed: ${weapons.length}`)

    if (missedWeaponBuckets.size > 0) {
      console.warn(`[Parser] Found weapons in unexpected buckets:`, Array.from(missedWeaponBuckets))
    }

    return weapons
  }

  /**
   * Group weapons by hash (for deduplication)
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
}

export const weaponParser = new WeaponParser()
