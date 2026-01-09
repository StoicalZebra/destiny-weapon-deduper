import { manifestService } from './manifest-service'
import { weaponParser } from './weapon-parser'
import { SOCKET_CATEGORY_INTRINSIC_TRAITS, SOCKET_CATEGORY_WEAPON_PERKS } from '@/utils/constants'
import type { DedupedWeapon, PerkColumn } from '@/models/deduped-weapon'
import type { WeaponInstance } from '@/models/weapon-instance'
import type { Perk } from '@/models/perk'

interface DestinySocketTypeDefinition {
  displayProperties?: {
    name?: string
  }
}

interface DestinySocketCategoryDefinition {
  displayProperties?: {
    name?: string
  }
}

interface SocketEntry {
  socketTypeHash: number
  singleInitialItemHash?: number
  reusablePlugSetHash?: number
  randomizedPlugSetHash?: number
}

type ColumnKind = 'intrinsic' | 'barrel' | 'magazine' | 'trait' | 'origin' | 'masterwork' | 'other'

const BARREL_TYPE_NAMES = new Set([
  'barrel',
  'rail',
  'scope',
  'sight',
  'bowstring'
])

const MAGAZINE_TYPE_NAMES = new Set([
  'magazine',
  'battery',
  'bolt',
  'bolts',
  'arrow',
  'ammunition'
])

const PERK_CATEGORY_HASHES = new Set<number>([
  SOCKET_CATEGORY_WEAPON_PERKS,
  SOCKET_CATEGORY_INTRINSIC_TRAITS
])

function getSocketCategoryName(categoryHash: number): string | null {
  const categoryDef = manifestService.getDefinition<DestinySocketCategoryDefinition>(
    'DestinySocketCategoryDefinition',
    categoryHash
  )
  return categoryDef?.displayProperties?.name || null
}

function getSocketTypeName(socketTypeHash: number, fallback: string): string {
  const socketTypeDef = manifestService.getDefinition<DestinySocketTypeDefinition>(
    'DestinySocketTypeDefinition',
    socketTypeHash
  )
  return socketTypeDef?.displayProperties?.name || fallback
}

export function normalizePerkName(name: string): string {
  return name.replace(/^enhanced\s+/i, '').trim().toLowerCase()
}

export function isEnhancedPerkName(name: string): boolean {
  return /^enhanced\s+/i.test(name)
}

function isMasterworkPlug(hash: number): boolean {
  const perkDef = manifestService.getInventoryItem(hash)
  const name = perkDef?.displayProperties?.name?.toLowerCase() || ''
  const typeName = perkDef?.itemTypeDisplayName?.toLowerCase() || ''

  // Check plug category identifier for reliable detection
  const plugCategory = perkDef?.plug?.plugCategoryIdentifier?.toLowerCase() || ''
  if (plugCategory.includes('masterworks.stat')) return true

  if (typeName.includes('masterwork')) return true

  if (name.includes('masterwork')) {
    if (name.startsWith('tier ')) return false
    if (name.includes('random masterwork')) return false
    if (name.includes('empty mod socket')) return false
    return true
  }

  if (name.includes('masterworked')) return true

  return false
}

function isMasterworkDisplayCandidate(hash: number): boolean {
  const perkDef = manifestService.getInventoryItem(hash)
  if (!perkDef) return false
  const name = perkDef.displayProperties?.name?.toLowerCase() || ''

  if (!name) return false

  // Check plug category identifier
  const plugCategory = perkDef?.plug?.plugCategoryIdentifier?.toLowerCase() || ''
  if (plugCategory.includes('masterworks.stat')) return true

  if (name.startsWith('tier ')) return false
  if (name.includes('random masterwork')) return false
  if (name.includes('empty mod socket')) return false

  return true
}

export function isTrackerColumn(
  socketTypeName: string,
  categoryName: string | null,
  perkNames: string[],
  perkTypeNames: string[]
): boolean {
  const combined = `${socketTypeName} ${categoryName || ''}`.toLowerCase()
  if (combined.includes('tracker') || combined.includes('memento')) return true

  if (perkTypeNames.some((name) => {
    const lower = name.toLowerCase()
    return lower.includes('tracker') || lower.includes('memento')
  })) {
    return true
  }

  if (perkNames.length === 0) return false
  return perkNames.every((name) => {
    const lower = name.toLowerCase()
    return lower.includes('tracker') || lower.includes('memento')
  })
}

export function getColumnKind(
  socketTypeName: string,
  categoryName: string | null,
  perkTypeNames: string[]
): ColumnKind {
  const typeName = socketTypeName.toLowerCase()
  const category = (categoryName || '').toLowerCase()
  const perkTypes = perkTypeNames.map((name) => name.toLowerCase())

  if (perkTypes.some((name) => name.includes('intrinsic'))) return 'intrinsic'
  if (perkTypes.some((name) => name.includes('origin'))) return 'origin'
  if (perkTypes.some((name) => name.includes('masterwork'))) return 'masterwork'
  if (perkTypes.some((name) => BARREL_TYPE_NAMES.has(name))) return 'barrel'
  if (perkTypes.some((name) => MAGAZINE_TYPE_NAMES.has(name))) return 'magazine'
  if (perkTypes.some((name) => name.includes('barrel'))) return 'barrel'
  if (perkTypes.some((name) => name.includes('magazine'))) return 'magazine'
  if (perkTypes.some((name) => name.includes('trait') || name.includes('perk'))) return 'trait'

  if (category.includes('intrinsic')) return 'intrinsic'
  if (typeName.includes('intrinsic')) return 'intrinsic'
  if (typeName.includes('masterwork')) return 'masterwork'
  if (typeName.includes('barrel')) return 'barrel'
  if (typeName.includes('magazine')) return 'magazine'
  if (typeName.includes('origin')) return 'origin'
  if (typeName.includes('trait') || typeName.includes('perk')) return 'trait'
  if (category.includes('weapon perks')) return 'trait'

  return 'other'
}

function getPlugItemTypeNames(plugItemHashes: number[]): string[] {
  const typeNames = new Set<string>()

  for (const hash of plugItemHashes) {
    const perkDef = manifestService.getInventoryItem(hash)
    const typeName = perkDef?.itemTypeDisplayName
    if (typeName) {
      typeNames.add(typeName)
    }
  }

  return Array.from(typeNames)
}

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

function getOwnedPlugHashes(
  instances: WeaponInstance[],
  socketIndex: number,
  ignoreReusable: boolean = false
): Set<number> {
  const ownedPerks = new Set<number>()

  for (const instance of instances) {
    if (!ignoreReusable) {
      const plugOptions = instance.socketPlugsByIndex?.[socketIndex]
      if (plugOptions && plugOptions.length > 0) {
        for (const plugHash of plugOptions) {
          ownedPerks.add(plugHash)
        }
      }
    }
    const socket = instance.sockets.sockets[socketIndex]
    if (socket?.plugHash) {
      ownedPerks.add(socket.plugHash)
    }
  }

  return ownedPerks
}

function buildPerkColumn(
  socketEntry: SocketEntry,
  plugItemHashes: number[],
  socketIndex: number,
  instances: WeaponInstance[],
  fallbackName: string
): PerkColumn | null {
  if (plugItemHashes.length === 0) return null

  const ownedPerks = getOwnedPlugHashes(instances, socketIndex)
  const allPlugHashes = new Set<number>(plugItemHashes)

  for (const ownedHash of ownedPerks) {
    allPlugHashes.add(ownedHash)
  }

  const perkGroups = new Map<string, { hash: number; name: string }[]>()

  for (const hash of allPlugHashes) {
    const perkDef = manifestService.getInventoryItem(hash)
    const perkName = perkDef?.displayProperties?.name || `Unknown Perk (${hash})`
    const normalized = normalizePerkName(perkName)

    if (!perkGroups.has(normalized)) {
      perkGroups.set(normalized, [])
    }
    perkGroups.get(normalized)!.push({ hash, name: perkName })
  }

  const availablePerks: Perk[] = []

  for (const variants of perkGroups.values()) {
    const enhancedVariant = variants.find((variant) => isEnhancedPerkName(variant.name))
    const chosen = enhancedVariant || variants[0]
    const perkDef = manifestService.getInventoryItem(chosen.hash)

    let isOwned = variants.some((variant) => ownedPerks.has(variant.hash))

    // Fix for Origin Traits that use a fixed reusablePlugSet (like Aisha's Care)
    // If the socket has a reusablePlugSet (fixed options) and is NOT randomized,
    // we assume all options in that set are available/owned.
    if (!isOwned && fallbackName === 'Origin Trait') {
      const hasFixedPlugs = !!socketEntry.reusablePlugSetHash
      const hasRandomPlugs = !!socketEntry.randomizedPlugSetHash
      if (hasFixedPlugs && !hasRandomPlugs) {
        isOwned = true
      }
    }

    // Collect all variant hashes (enhanced + non-enhanced) for hover matching
    const variantHashes = variants.map((v) => v.hash)

    availablePerks.push({
      hash: chosen.hash,
      name: perkDef?.displayProperties?.name || `Unknown Perk (${chosen.hash})`,
      description: perkDef?.displayProperties?.description || '',
      icon: perkDef?.displayProperties?.icon || '',
      isOwned,
      variantHashes
    })
  }

  availablePerks.sort((a, b) => a.name.localeCompare(b.name))

  return {
    columnIndex: socketIndex,
    columnName: getSocketTypeName(socketEntry.socketTypeHash, fallbackName),
    availablePerks,
    ownedPerks
  }
}

function buildOwnedPerksList(
  socketIndex: number,
  instances: WeaponInstance[],
  filter?: (hash: number) => boolean,
  ignoreReusable: boolean = false
): Perk[] {
  const ownedHashes = getOwnedPlugHashes(instances, socketIndex, ignoreReusable)
  const ownedPerks: Perk[] = []

  for (const hash of ownedHashes) {
    if (filter && !filter(hash)) continue
    const perkDef = manifestService.getInventoryItem(hash)
    if (!perkDef) continue
    ownedPerks.push({
      hash,
      name: perkDef.displayProperties?.name || `Unknown Perk (${hash})`,
      description: perkDef.displayProperties?.description || '',
      icon: perkDef.displayProperties?.icon || '',
      isOwned: true
    })
  }

  ownedPerks.sort((a, b) => a.name.localeCompare(b.name))
  return ownedPerks
}

function buildPerkMatrix(
  weaponHash: number,
  instances: WeaponInstance[]
): { matrix: PerkColumn[]; intrinsicPerks: Perk[]; masterworkPerks: Perk[] } {
  const weaponDef = manifestService.getInventoryItem(weaponHash)
  const socketData = weaponDef?.sockets

  if (!socketData?.socketEntries?.length || !socketData.socketCategories?.length) {
    return { matrix: [], intrinsicPerks: [], masterworkPerks: [] }
  }

  const socketEntries = socketData.socketEntries as SocketEntry[]
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

  const columnCandidates: Array<{
    socketIndex: number
    socketEntry: SocketEntry
    socketTypeName: string
    categoryName: string | null
    kind: ColumnKind
    plugItemHashes: number[]
    perkTypeNames: string[]
  }> = []

  for (const socketIndex of socketIndexes) {
    const socketEntry = socketEntries[socketIndex]
    if (!socketEntry) continue

    const categoryHash = socketData.socketCategories.find((cat) =>
      cat.socketIndexes.includes(socketIndex)
    )?.socketCategoryHash

    const categoryName = categoryHash ? getSocketCategoryName(categoryHash) : null
    const socketTypeName = getSocketTypeName(
      socketEntry.socketTypeHash,
      `Perk Column ${socketIndex + 1}`
    )
    const plugItemHashes = getPlugItemHashes(socketEntry)
    const perkTypeNames = getPlugItemTypeNames(plugItemHashes)
    const kind = getColumnKind(socketTypeName, categoryName, perkTypeNames)

    columnCandidates.push({
      socketIndex,
      socketEntry,
      socketTypeName,
      categoryName,
      kind,
      plugItemHashes,
      perkTypeNames
    })
  }

  columnCandidates.sort((a, b) => a.socketIndex - b.socketIndex)

  const columnsByKind: Record<ColumnKind, typeof columnCandidates> = {
    intrinsic: [],
    barrel: [],
    magazine: [],
    trait: [],
    origin: [],
    masterwork: [],
    other: []
  }

  for (const candidate of columnCandidates) {
    columnsByKind[candidate.kind].push(candidate)
  }

  const orderedColumns: Array<{
    label: string
    candidate: typeof columnCandidates[number]
  }> = []

  const barrel = columnsByKind.barrel[0]
  if (barrel) {
    orderedColumns.push({ label: 'Barrel', candidate: barrel })
  }

  const magazine = columnsByKind.magazine[0]
  if (magazine) {
    orderedColumns.push({ label: 'Magazine', candidate: magazine })
  }

  const traitColumns = columnsByKind.trait.slice(0, 2)
  if (traitColumns[0]) {
    orderedColumns.push({ label: 'Left Trait', candidate: traitColumns[0] })
  }
  if (traitColumns[1]) {
    orderedColumns.push({ label: 'Right Trait', candidate: traitColumns[1] })
  }

  const origin = columnsByKind.origin[0]
  if (origin) {
    orderedColumns.push({ label: 'Origin Trait', candidate: origin })
  }

  const perkColumns: PerkColumn[] = []
  const intrinsicPerks: Perk[] = []
  const masterworkPerks: Perk[] = []

  let masterworkCandidate = columnsByKind.masterwork[0]

  if (!masterworkCandidate) {
    for (let index = 0; index < socketEntries.length; index++) {
      const socketEntry = socketEntries[index]
      if (!socketEntry) continue
      const plugItemHashes = getPlugItemHashes(socketEntry)
      const socketTypeName = getSocketTypeName(
        socketEntry.socketTypeHash,
        `Perk Column ${index + 1}`
      )
      if (
        socketTypeName.toLowerCase().includes('masterwork') ||
        plugItemHashes.some((hash) => isMasterworkPlug(hash))
      ) {
        masterworkCandidate = {
          socketIndex: index,
          socketEntry,
          socketTypeName,
          categoryName: null,
          kind: 'masterwork',
          plugItemHashes,
          perkTypeNames: getPlugItemTypeNames(plugItemHashes)
        }
        break
      }
    }
  }

  const intrinsic = columnsByKind.intrinsic[0]
  if (intrinsic) {
    const column = buildPerkColumn(
      intrinsic.socketEntry,
      intrinsic.plugItemHashes,
      intrinsic.socketIndex,
      instances,
      'Intrinsic Traits'
    )
    if (column) {
      intrinsicPerks.push(...column.availablePerks)
    }
  }

  const masterwork = masterworkCandidate
  if (masterwork) {
    const socketTypeName = masterwork.socketTypeName.toLowerCase()
    const filter = socketTypeName.includes('masterwork')
      ? isMasterworkDisplayCandidate
      : isMasterworkPlug
    masterworkPerks.push(
      ...buildOwnedPerksList(
        masterwork.socketIndex,
        instances,
        filter,
        true
      )
    )
  }

  for (const { label, candidate } of orderedColumns) {
    const column = buildPerkColumn(
      candidate.socketEntry,
      candidate.plugItemHashes,
      candidate.socketIndex,
      instances,
      label
    )

    if (!column) continue

    const perkNames = column.availablePerks.map((perk) => perk.name)
    if (isTrackerColumn(
      candidate.socketTypeName,
      candidate.categoryName,
      perkNames,
      candidate.perkTypeNames
    )) {
      continue
    }

    column.columnName = label
    perkColumns.push(column)
  }

  return { matrix: perkColumns, intrinsicPerks, masterworkPerks }
}

export function countOwnedPerks(columns: PerkColumn[]): number {
  let count = 0
  for (const column of columns) {
    for (const perk of column.availablePerks) {
      if (perk.isOwned) count += 1
    }
  }
  return count
}

export function countPossiblePerks(columns: PerkColumn[]): number {
  return columns.reduce((sum, column) => sum + column.availablePerks.length, 0)
}

/**
 * Calculate gear tier range across all instances
 * Returns { min, max } or { null, null } if no instances have tier data
 */
function calculateGearTierRange(instances: WeaponInstance[]): { min: number | null; max: number | null } {
  const tiers = instances
    .map(i => i.gearTier)
    .filter((t): t is number => typeof t === 'number' && t >= 1 && t <= 5)

  if (tiers.length === 0) {
    return { min: null, max: null }
  }

  return {
    min: Math.min(...tiers),
    max: Math.max(...tiers)
  }
}

export function buildDedupedWeapon(
  weaponHash: number,
  instances: WeaponInstance[]
): DedupedWeapon {
  const { matrix, intrinsicPerks, masterworkPerks } = buildPerkMatrix(weaponHash, instances)
  const totalPerksOwned = countOwnedPerks(matrix)
  const totalPerksPossible = countPossiblePerks(matrix)
  const completionPercentage = totalPerksPossible > 0
    ? Math.round((totalPerksOwned / totalPerksPossible) * 100)
    : 0
  const { min: minGearTier, max: maxGearTier } = calculateGearTierRange(instances)

  return {
    weaponHash,
    weaponName: weaponParser.getWeaponName(weaponHash),
    weaponIcon: weaponParser.getWeaponIcon(weaponHash),
    iconWatermark: weaponParser.getWeaponIconWatermark(weaponHash),
    perkMatrix: matrix,
    intrinsicPerks,
    masterworkPerks,
    instances,
    totalPerksOwned,
    totalPerksPossible,
    completionPercentage,
    tierType: weaponParser.getWeaponTierType(weaponHash),
    minGearTier,
    maxGearTier
  }
}
