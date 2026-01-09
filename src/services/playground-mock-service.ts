/**
 * Playground Mock Service
 *
 * Generates mock weapon instances for the playground/demo mode using real
 * weapon data from the Destiny 2 manifest. This allows showcasing the full
 * app UI without requiring Bungie authentication.
 */

import { manifestService, type DestinyInventoryItemDefinition } from './manifest-service'
import { buildDedupedWeapon } from './deduplication'
import { SOCKET_CATEGORY_WEAPON_PERKS, SOCKET_CATEGORY_INTRINSIC_TRAITS } from '@/utils/constants'
import type { WeaponInstance, SocketInstance } from '@/models/weapon-instance'
import type { DedupedWeapon } from '@/models/deduped-weapon'

/**
 * Curated showcase weapons for the playground
 * These are popular weapons with good perk variety
 */
export const SHOWCASE_WEAPONS = [
  { hash: 3615748501, name: 'Elsie\'s Rifle' },      // From community picks
  { hash: 1399109800, name: 'Luna\'s Howl' },        // Iconic hand cannon
  { hash: 3628991658, name: 'Falling Guillotine' },  // Popular sword
  { hash: 3849444474, name: 'Austringer' },          // Classic hand cannon
] as const

interface SocketEntry {
  socketTypeHash: number
  singleInitialItemHash?: number
  reusablePlugSetHash?: number
  randomizedPlugSetHash?: number
}

const PERK_CATEGORY_HASHES = new Set<number>([
  SOCKET_CATEGORY_WEAPON_PERKS,
  SOCKET_CATEGORY_INTRINSIC_TRAITS
])

/**
 * Extract all possible perk hashes for a socket entry
 */
function getPlugItemHashes(socketEntry: SocketEntry): number[] {
  const hashes = new Set<number>()

  if (socketEntry.singleInitialItemHash) {
    hashes.add(socketEntry.singleInitialItemHash)
  }

  const plugSetHashes = [
    socketEntry.reusablePlugSetHash,
    socketEntry.randomizedPlugSetHash
  ].filter((hash): hash is number => typeof hash === 'number' && hash > 0)

  for (const plugSetHash of plugSetHashes) {
    const plugSet = manifestService.getPlugSet(plugSetHash)
    if (!plugSet) continue

    for (const plugItem of plugSet.reusablePlugItems) {
      hashes.add(plugItem.plugItemHash)
    }
  }

  return Array.from(hashes)
}

/**
 * Get perk socket indexes for a weapon (barrel, magazine, traits, origin)
 */
function getPerkSocketIndexes(weaponDef: DestinyInventoryItemDefinition): number[] {
  const socketData = weaponDef.sockets
  if (!socketData?.socketEntries?.length || !socketData.socketCategories?.length) {
    return []
  }

  const socketIndexes: number[] = []
  const seenIndexes = new Set<number>()

  for (const category of socketData.socketCategories) {
    if (!PERK_CATEGORY_HASHES.has(category.socketCategoryHash)) continue

    for (const index of category.socketIndexes) {
      if (seenIndexes.has(index)) continue
      seenIndexes.add(index)
      socketIndexes.push(index)
    }
  }

  return socketIndexes
}

/**
 * Get all possible perks per socket index for a weapon
 */
function getWeaponPerkOptions(weaponHash: number): Map<number, number[]> {
  const weaponDef = manifestService.getInventoryItem(weaponHash)
  if (!weaponDef?.sockets?.socketEntries) {
    return new Map()
  }

  const perkSocketIndexes = getPerkSocketIndexes(weaponDef)
  const socketEntries = weaponDef.sockets.socketEntries as SocketEntry[]
  const perksPerSocket = new Map<number, number[]>()

  for (const socketIndex of perkSocketIndexes) {
    const socketEntry = socketEntries[socketIndex]
    if (!socketEntry) continue

    const plugHashes = getPlugItemHashes(socketEntry)
    if (plugHashes.length > 0) {
      perksPerSocket.set(socketIndex, plugHashes)
    }
  }

  return perksPerSocket
}

/**
 * Generate a random mock weapon instance with varied perks
 */
function generateMockInstance(
  weaponHash: number,
  perksPerSocket: Map<number, number[]>,
  instanceIndex: number
): WeaponInstance {
  const sockets: SocketInstance[] = []
  const socketPlugsByIndex: Record<number, number[]> = {}

  // Build socket array - need to fill in all indexes up to the max perk socket
  const maxSocketIndex = Math.max(...perksPerSocket.keys(), 0)

  for (let i = 0; i <= maxSocketIndex; i++) {
    const availablePerks = perksPerSocket.get(i)

    if (availablePerks && availablePerks.length > 0) {
      // Randomly select an active perk
      const randomIndex = Math.floor(Math.random() * availablePerks.length)
      const activePerk = availablePerks[randomIndex]

      sockets.push({
        plugHash: activePerk,
        isEnabled: true
      })

      // For varied ownership, give some instances access to different subsets of perks
      // This simulates having different rolls across instances
      const ownedPerks = availablePerks.filter(() => {
        // 60-80% chance to own each perk, varies by instance
        const ownershipChance = 0.6 + (instanceIndex * 0.05)
        return Math.random() < ownershipChance
      })

      // Always include the active perk in owned
      if (!ownedPerks.includes(activePerk)) {
        ownedPerks.push(activePerk)
      }

      socketPlugsByIndex[i] = ownedPerks
    } else {
      // Empty socket placeholder
      sockets.push({
        plugHash: 0,
        isEnabled: false
      })
    }
  }

  return {
    itemInstanceId: crypto.randomUUID(),
    itemHash: weaponHash,
    sockets: { sockets },
    socketPlugsByIndex
  }
}

/**
 * Generate multiple mock instances for a weapon with varied perk ownership
 */
function generateMockInstances(
  weaponHash: number,
  count: number = 5
): WeaponInstance[] {
  const perksPerSocket = getWeaponPerkOptions(weaponHash)

  if (perksPerSocket.size === 0) {
    console.warn(`No perk options found for weapon ${weaponHash}`)
    return []
  }

  const instances: WeaponInstance[] = []

  for (let i = 0; i < count; i++) {
    instances.push(generateMockInstance(weaponHash, perksPerSocket, i))
  }

  return instances
}

/**
 * Get a single showcase weapon as a DedupedWeapon
 */
export async function getShowcaseWeapon(weaponHash: number): Promise<DedupedWeapon | null> {
  const weaponDef = manifestService.getInventoryItem(weaponHash)
  if (!weaponDef) {
    console.warn(`Weapon definition not found for hash ${weaponHash}`)
    return null
  }

  const instances = generateMockInstances(weaponHash, 5 + Math.floor(Math.random() * 3))

  if (instances.length === 0) {
    return null
  }

  return buildDedupedWeapon(weaponHash, instances)
}

/**
 * Get all showcase weapons as DedupedWeapon array
 */
export async function getShowcaseWeapons(): Promise<DedupedWeapon[]> {
  const weapons: DedupedWeapon[] = []

  for (const { hash } of SHOWCASE_WEAPONS) {
    const weapon = await getShowcaseWeapon(hash)
    if (weapon) {
      weapons.push(weapon)
    }
  }

  return weapons
}

/**
 * Check if a weapon hash is a valid showcase weapon
 */
export function isShowcaseWeapon(weaponHash: number): boolean {
  return SHOWCASE_WEAPONS.some(w => w.hash === weaponHash)
}

/**
 * Get showcase weapon info by hash
 */
export function getShowcaseWeaponInfo(weaponHash: number): { hash: number; name: string } | null {
  return SHOWCASE_WEAPONS.find(w => w.hash === weaponHash) || null
}
