import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  normalizePerkName,
  getColumnKind,
  isTrackerColumn,
  countOwnedPerks,
  countPossiblePerks,
  getInstanceMasterwork,
  buildDedupedWeapon,
  buildDedupedWeaponFromManifest
} from './deduplication'
import type { PerkColumn } from '@/models/deduped-weapon'
import type { Perk } from '@/models/perk'
import type { WeaponInstance } from '@/models/weapon-instance'
import { manifestService } from '@/services/manifest-service'
import { weaponParser } from '@/services/weapon-parser'

describe('normalizePerkName', () => {
  it('removes "Enhanced" prefix (legacy data) and lowercases', () => {
    expect(normalizePerkName('Enhanced Rampage')).toBe('rampage')
  })

  it('handles "enhanced" prefix case-insensitively', () => {
    expect(normalizePerkName('ENHANCED Kill Clip')).toBe('kill clip')
    expect(normalizePerkName('enhanced outlaw')).toBe('outlaw')
  })

  it('trims whitespace', () => {
    expect(normalizePerkName('  Rampage  ')).toBe('rampage')
    expect(normalizePerkName('Enhanced  Rampage')).toBe('rampage')
  })

  it('returns lowercase for non-enhanced perks', () => {
    expect(normalizePerkName('Rampage')).toBe('rampage')
    expect(normalizePerkName('Kill Clip')).toBe('kill clip')
  })

  it('handles empty string', () => {
    expect(normalizePerkName('')).toBe('')
  })
})

describe('getColumnKind', () => {
  describe('intrinsic detection', () => {
    it('returns intrinsic when perkTypeNames includes intrinsic', () => {
      expect(getColumnKind('', null, ['Intrinsic'])).toBe('intrinsic')
      expect(getColumnKind('', null, ['Intrinsic Trait'])).toBe('intrinsic')
    })

    it('returns intrinsic when category includes intrinsic', () => {
      expect(getColumnKind('', 'INTRINSIC TRAITS', [])).toBe('intrinsic')
    })

    it('returns intrinsic when socketTypeName includes intrinsic', () => {
      expect(getColumnKind('Intrinsic', null, [])).toBe('intrinsic')
    })
  })

  describe('barrel detection', () => {
    it('returns barrel for barrel type names', () => {
      expect(getColumnKind('', null, ['Barrel'])).toBe('barrel')
    })

    it('returns barrel for rail type', () => {
      expect(getColumnKind('', null, ['Rail'])).toBe('barrel')
    })

    it('returns barrel for scope type', () => {
      expect(getColumnKind('', null, ['Scope'])).toBe('barrel')
    })

    it('returns barrel for sight type', () => {
      expect(getColumnKind('', null, ['Sight'])).toBe('barrel')
    })

    it('returns barrel for bowstring type', () => {
      expect(getColumnKind('', null, ['Bowstring'])).toBe('barrel')
    })

    it('returns barrel when socketTypeName includes barrel', () => {
      expect(getColumnKind('Barrel Options', null, [])).toBe('barrel')
    })
  })

  describe('magazine detection', () => {
    it('returns magazine for magazine type names', () => {
      expect(getColumnKind('', null, ['Magazine'])).toBe('magazine')
    })

    it('returns magazine for battery type', () => {
      expect(getColumnKind('', null, ['Battery'])).toBe('magazine')
    })

    it('returns magazine for bolt type', () => {
      expect(getColumnKind('', null, ['Bolt'])).toBe('magazine')
      expect(getColumnKind('', null, ['Bolts'])).toBe('magazine')
    })

    it('returns magazine for arrow type', () => {
      expect(getColumnKind('', null, ['Arrow'])).toBe('magazine')
    })

    it('returns magazine for ammunition type', () => {
      expect(getColumnKind('', null, ['Ammunition'])).toBe('magazine')
    })

    it('returns magazine when socketTypeName includes magazine', () => {
      expect(getColumnKind('Magazine Options', null, [])).toBe('magazine')
    })
  })

  describe('origin detection', () => {
    it('returns origin when perkTypeNames includes origin', () => {
      expect(getColumnKind('', null, ['Origin Trait'])).toBe('origin')
    })

    it('returns origin when socketTypeName includes origin', () => {
      expect(getColumnKind('Origin Trait Socket', null, [])).toBe('origin')
    })
  })

  describe('masterwork detection', () => {
    it('returns masterwork when perkTypeNames includes masterwork', () => {
      expect(getColumnKind('', null, ['Masterwork'])).toBe('masterwork')
    })

    it('returns masterwork when socketTypeName includes masterwork', () => {
      expect(getColumnKind('Masterwork', null, [])).toBe('masterwork')
    })
  })

  describe('trait detection', () => {
    it('returns trait when perkTypeNames includes trait', () => {
      expect(getColumnKind('', null, ['Trait'])).toBe('trait')
      expect(getColumnKind('', null, ['Weapon Trait'])).toBe('trait')
    })

    it('returns trait when perkTypeNames includes perk', () => {
      expect(getColumnKind('', null, ['Perk'])).toBe('trait')
    })

    it('returns trait when socketTypeName includes trait', () => {
      expect(getColumnKind('Trait Socket', null, [])).toBe('trait')
    })

    it('returns trait when category is weapon perks', () => {
      expect(getColumnKind('', 'WEAPON PERKS', [])).toBe('trait')
    })
  })

  describe('fallback behavior', () => {
    it('returns other when no match found', () => {
      expect(getColumnKind('Unknown', null, [])).toBe('other')
      expect(getColumnKind('', 'Unknown Category', ['Unknown Type'])).toBe('other')
    })
  })

  describe('priority order', () => {
    it('prioritizes intrinsic over other types', () => {
      expect(getColumnKind('Barrel', null, ['Intrinsic'])).toBe('intrinsic')
    })

    it('prioritizes origin over masterwork', () => {
      expect(getColumnKind('', null, ['Origin', 'Masterwork'])).toBe('origin')
    })
  })
})

describe('isTrackerColumn', () => {
  it('returns true when socketTypeName contains tracker', () => {
    expect(isTrackerColumn('Kill Tracker', null, [], [])).toBe(true)
  })

  it('returns true when socketTypeName contains memento', () => {
    expect(isTrackerColumn('Memento Socket', null, [], [])).toBe(true)
  })

  it('returns true when categoryName contains tracker', () => {
    expect(isTrackerColumn('', 'Tracker Category', [], [])).toBe(true)
  })

  it('returns true when perkTypeNames contain tracker', () => {
    expect(isTrackerColumn('', null, [], ['Kill Tracker'])).toBe(true)
  })

  it('returns true when perkTypeNames contain memento', () => {
    expect(isTrackerColumn('', null, [], ['Memento'])).toBe(true)
  })

  it('returns true when all perkNames are trackers', () => {
    expect(isTrackerColumn('', null, ['Crucible Tracker', 'Vanguard Tracker'], [])).toBe(true)
  })

  it('returns false when perkNames is empty', () => {
    expect(isTrackerColumn('Regular Socket', null, [], [])).toBe(false)
  })

  it('returns false when only some perkNames are trackers', () => {
    expect(isTrackerColumn('', null, ['Rampage', 'Kill Tracker'], [])).toBe(false)
  })

  it('returns false for regular perk columns', () => {
    expect(isTrackerColumn('Trait', 'Weapon Perks', ['Rampage', 'Kill Clip'], ['Trait'])).toBe(false)
  })
})

describe('countOwnedPerks', () => {
  const createPerk = (isOwned: boolean): Perk => ({
    hash: Math.random(),
    name: 'Test Perk',
    description: '',
    icon: '',
    isOwned
  })

  const createColumn = (ownedCount: number, totalCount: number): PerkColumn => ({
    columnIndex: 0,
    columnName: 'Test',
    availablePerks: [
      ...Array(ownedCount).fill(null).map(() => createPerk(true)),
      ...Array(totalCount - ownedCount).fill(null).map(() => createPerk(false))
    ],
    ownedPerks: new Set()
  })

  it('returns 0 for empty columns', () => {
    expect(countOwnedPerks([])).toBe(0)
  })

  it('counts owned perks in single column', () => {
    expect(countOwnedPerks([createColumn(3, 5)])).toBe(3)
  })

  it('counts owned perks across multiple columns', () => {
    expect(countOwnedPerks([
      createColumn(2, 4),
      createColumn(3, 5),
      createColumn(1, 3)
    ])).toBe(6)
  })

  it('returns 0 when no perks are owned', () => {
    expect(countOwnedPerks([createColumn(0, 5)])).toBe(0)
  })

  it('counts all when all perks are owned', () => {
    expect(countOwnedPerks([createColumn(5, 5)])).toBe(5)
  })
})

describe('countPossiblePerks', () => {
  const createColumn = (perkCount: number): PerkColumn => ({
    columnIndex: 0,
    columnName: 'Test',
    availablePerks: Array(perkCount).fill({
      hash: 0,
      name: 'Test',
      description: '',
      icon: '',
      isOwned: false
    }),
    ownedPerks: new Set()
  })

  it('returns 0 for empty columns', () => {
    expect(countPossiblePerks([])).toBe(0)
  })

  it('counts perks in single column', () => {
    expect(countPossiblePerks([createColumn(5)])).toBe(5)
  })

  it('sums perks across multiple columns', () => {
    expect(countPossiblePerks([
      createColumn(4),
      createColumn(6),
      createColumn(3)
    ])).toBe(13)
  })

  it('handles columns with zero perks', () => {
    expect(countPossiblePerks([
      createColumn(0),
      createColumn(5),
      createColumn(0)
    ])).toBe(5)
  })
})

describe('getInstanceMasterwork', () => {
  const createInstance = (sockets: Array<{ plugHash: number; isEnabled: boolean }>): WeaponInstance => ({
    itemInstanceId: 'test-123',
    itemHash: 12345,
    sockets: { sockets }
  })

  beforeEach(() => {
    vi.spyOn(manifestService, 'getInventoryItem')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null when masterworkSocketIndex is undefined', () => {
    const instance = createInstance([{ plugHash: 123, isEnabled: true }])
    expect(getInstanceMasterwork(instance, undefined)).toBeNull()
  })

  it('returns null when socket at index has no plugHash', () => {
    const instance = createInstance([{ plugHash: 0, isEnabled: false }])
    expect(getInstanceMasterwork(instance, 0)).toBeNull()
  })

  it('returns null when socket index is out of bounds', () => {
    const instance = createInstance([{ plugHash: 123, isEnabled: true }])
    expect(getInstanceMasterwork(instance, 5)).toBeNull()
  })

  it('returns null when manifest lookup fails', () => {
    vi.mocked(manifestService.getInventoryItem).mockReturnValue(null)
    const instance = createInstance([{ plugHash: 123, isEnabled: true }])
    expect(getInstanceMasterwork(instance, 0)).toBeNull()
  })

  it('returns masterwork info for valid masterwork perk', () => {
    vi.mocked(manifestService.getInventoryItem).mockReturnValue({
      displayProperties: { name: 'Range Masterwork', description: 'Increases range', icon: '/icons/range.png' },
      itemTypeDisplayName: 'Masterwork',
      plug: { plugCategoryIdentifier: 'masterworks.stat.range' }
    } as any)

    const instance = createInstance([{ plugHash: 123, isEnabled: true }])
    const result = getInstanceMasterwork(instance, 0)

    expect(result).toEqual({
      hash: 123,
      name: 'Range Masterwork',
      icon: '/icons/range.png'
    })
  })

  it('filters out tier tracking perks', () => {
    vi.mocked(manifestService.getInventoryItem).mockReturnValue({
      displayProperties: { name: 'Tier 5', description: '', icon: '' },
      itemTypeDisplayName: 'Masterwork',
      plug: { plugCategoryIdentifier: '' }
    } as any)

    const instance = createInstance([{ plugHash: 789, isEnabled: true }])
    expect(getInstanceMasterwork(instance, 0)).toBeNull()
  })

  it('filters out random masterwork placeholder', () => {
    vi.mocked(manifestService.getInventoryItem).mockReturnValue({
      displayProperties: { name: 'Random Masterwork', description: '', icon: '' },
      itemTypeDisplayName: 'Masterwork',
      plug: { plugCategoryIdentifier: '' }
    } as any)

    const instance = createInstance([{ plugHash: 999, isEnabled: true }])
    expect(getInstanceMasterwork(instance, 0)).toBeNull()
  })
})

describe('buildDedupedWeapon', () => {
  const createInstance = (
    itemHash: number,
    instanceId: string,
    sockets: Array<{ plugHash: number; isEnabled: boolean }>,
    socketPlugsByIndex?: Record<number, number[]>,
    gearTier?: number
  ): WeaponInstance => ({
    itemInstanceId: instanceId,
    itemHash,
    sockets: { sockets },
    socketPlugsByIndex,
    gearTier
  })

  beforeEach(() => {
    vi.spyOn(manifestService, 'getInventoryItem')
    vi.spyOn(manifestService, 'getDefinition')
    vi.spyOn(manifestService, 'getPlugSet')
    vi.spyOn(manifestService, 'getWeaponVariantHashes')
    vi.spyOn(manifestService, 'isHolofoilWeapon')
    vi.spyOn(weaponParser, 'getWeaponName')
    vi.spyOn(weaponParser, 'getWeaponType')
    vi.spyOn(weaponParser, 'getWeaponIcon')
    vi.spyOn(weaponParser, 'getWeaponIconWatermark')
    vi.spyOn(weaponParser, 'getWeaponSeasonName')
    vi.spyOn(weaponParser, 'getWeaponTierType')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function setupMinimalMocks() {
    // Weapon definition with no socket data
    vi.mocked(manifestService.getInventoryItem).mockReturnValue({
      displayProperties: { name: 'Test Weapon', description: '', icon: '/icon.png' },
      itemTypeDisplayName: 'Hand Cannon',
      itemType: 3,
      inventory: { tierType: 5 }
    } as any)

    vi.mocked(manifestService.isHolofoilWeapon).mockReturnValue(false)
    vi.mocked(weaponParser.getWeaponName).mockReturnValue('Test Weapon')
    vi.mocked(weaponParser.getWeaponType).mockReturnValue('Hand Cannon')
    vi.mocked(weaponParser.getWeaponIcon).mockReturnValue('/icon.png')
    vi.mocked(weaponParser.getWeaponIconWatermark).mockReturnValue('/watermark.png')
    vi.mocked(weaponParser.getWeaponSeasonName).mockReturnValue('Season 28')
    vi.mocked(weaponParser.getWeaponTierType).mockReturnValue(5)
  }

  it('builds deduped weapon with basic metadata', () => {
    setupMinimalMocks()

    const instances = [
      createInstance(12345, 'inst-1', [{ plugHash: 1, isEnabled: true }])
    ]

    const result = buildDedupedWeapon(instances)

    expect(result.weaponHash).toBe(12345)
    expect(result.weaponName).toBe('Test Weapon')
    expect(result.weaponType).toBe('Hand Cannon')
    expect(result.weaponIcon).toBe('/icon.png')
    expect(result.iconWatermark).toBe('/watermark.png')
    expect(result.seasonName).toBe('Season 28')
    expect(result.tierType).toBe(5)
    expect(result.instances).toHaveLength(1)
  })

  it('collects variant hashes from multiple instances', () => {
    setupMinimalMocks()

    // Normal weapon
    vi.mocked(manifestService.isHolofoilWeapon)
      .mockReturnValueOnce(false) // First instance
      .mockReturnValueOnce(true)  // Second instance (holofoil)
      .mockReturnValueOnce(false) // First hash in variant check
      .mockReturnValueOnce(true)  // Second hash in variant check

    const instances = [
      createInstance(12345, 'inst-1', [{ plugHash: 1, isEnabled: true }]),
      createInstance(12346, 'inst-2', [{ plugHash: 2, isEnabled: true }]) // Holofoil variant
    ]

    const result = buildDedupedWeapon(instances)

    expect(result.variantHashes).toHaveLength(2)
    expect(result.hasHolofoil).toBe(true)
    // Non-holofoil should be first (primary)
    expect(result.variantHashes[0].isHolofoil).toBe(false)
    expect(result.variantHashes[1].isHolofoil).toBe(true)
  })

  it('calculates gear tier range across instances', () => {
    setupMinimalMocks()

    const instances = [
      createInstance(12345, 'inst-1', [{ plugHash: 1, isEnabled: true }], undefined, 2),
      createInstance(12345, 'inst-2', [{ plugHash: 1, isEnabled: true }], undefined, 5),
      createInstance(12345, 'inst-3', [{ plugHash: 1, isEnabled: true }], undefined, 3)
    ]

    const result = buildDedupedWeapon(instances)

    expect(result.minGearTier).toBe(2)
    expect(result.maxGearTier).toBe(5)
  })

  it('handles null gear tier for pre-9.0.0 items', () => {
    setupMinimalMocks()

    const instances = [
      createInstance(12345, 'inst-1', [{ plugHash: 1, isEnabled: true }], undefined, undefined),
      createInstance(12345, 'inst-2', [{ plugHash: 1, isEnabled: true }], undefined, undefined)
    ]

    const result = buildDedupedWeapon(instances)

    expect(result.minGearTier).toBeNull()
    expect(result.maxGearTier).toBeNull()
  })

  it('ignores invalid gear tier values', () => {
    setupMinimalMocks()

    const instances = [
      createInstance(12345, 'inst-1', [{ plugHash: 1, isEnabled: true }], undefined, 0), // Invalid
      createInstance(12345, 'inst-2', [{ plugHash: 1, isEnabled: true }], undefined, 3),
      createInstance(12345, 'inst-3', [{ plugHash: 1, isEnabled: true }], undefined, 6)  // Invalid
    ]

    const result = buildDedupedWeapon(instances)

    expect(result.minGearTier).toBe(3)
    expect(result.maxGearTier).toBe(3)
  })

  it('calculates completion percentage correctly', () => {
    setupMinimalMocks()

    // Mock weapon definition with socket data that includes perk categories
    vi.mocked(manifestService.getInventoryItem).mockReturnValue({
      displayProperties: { name: 'Test Weapon', description: '', icon: '/icon.png' },
      itemTypeDisplayName: 'Hand Cannon',
      itemType: 3,
      inventory: { tierType: 5 },
      sockets: {
        socketEntries: [
          {
            socketTypeHash: 1,
            singleInitialItemHash: 100,
            reusablePlugSetHash: 1000
          }
        ],
        socketCategories: [
          {
            socketCategoryHash: 4241085061, // SOCKET_CATEGORY_WEAPON_PERKS
            socketIndexes: [0]
          }
        ]
      }
    } as any)

    // Mock socket type as "Barrel"
    vi.mocked(manifestService.getDefinition).mockImplementation((table, hash) => {
      if (table === 'DestinySocketTypeDefinition') {
        return { displayProperties: { name: 'Barrel' } }
      }
      return null
    })

    // Mock plug set with 4 perks
    vi.mocked(manifestService.getPlugSet).mockReturnValue({
      reusablePlugItems: [
        { plugItemHash: 100, currentlyCanRoll: true },
        { plugItemHash: 101, currentlyCanRoll: true },
        { plugItemHash: 102, currentlyCanRoll: true },
        { plugItemHash: 103, currentlyCanRoll: true }
      ]
    } as any)

    // Mock perk definitions (Barrel type)
    vi.mocked(manifestService.getInventoryItem).mockImplementation((hash) => {
      if (hash === 12345) {
        return {
          displayProperties: { name: 'Test Weapon', description: '', icon: '/icon.png' },
          itemTypeDisplayName: 'Hand Cannon',
          itemType: 3,
          inventory: { tierType: 5 },
          sockets: {
            socketEntries: [
              {
                socketTypeHash: 1,
                singleInitialItemHash: 100,
                reusablePlugSetHash: 1000
              }
            ],
            socketCategories: [
              {
                socketCategoryHash: 4241085061,
                socketIndexes: [0]
              }
            ]
          }
        } as any
      }
      // Perk definitions
      return {
        displayProperties: { name: `Perk ${hash}`, description: '', icon: '' },
        itemTypeDisplayName: 'Barrel'
      } as any
    })

    // Instance owns 2 of the 4 perks
    const instances = [
      createInstance(12345, 'inst-1', [{ plugHash: 100, isEnabled: true }], { 0: [100, 101] })
    ]

    const result = buildDedupedWeapon(instances)

    // Should have 2 owned out of 4 possible = 50%
    expect(result.totalPerksPossible).toBe(4)
    expect(result.totalPerksOwned).toBe(2)
    expect(result.completionPercentage).toBe(50)
  })

  it('returns 0% completion when no perks possible', () => {
    setupMinimalMocks()

    const instances = [
      createInstance(12345, 'inst-1', [{ plugHash: 1, isEnabled: true }])
    ]

    const result = buildDedupedWeapon(instances)

    // No socket data means no perks
    expect(result.totalPerksPossible).toBe(0)
    expect(result.completionPercentage).toBe(0)
  })

  it('prefers non-holofoil hash as primary', () => {
    setupMinimalMocks()

    // Make the first instance holofoil, second non-holofoil
    vi.mocked(manifestService.isHolofoilWeapon)
      .mockReturnValueOnce(true)   // First instance
      .mockReturnValueOnce(false)  // Second instance
      .mockReturnValueOnce(true)   // variant collection for hash 12346
      .mockReturnValueOnce(false)  // variant collection for hash 12345

    const instances = [
      createInstance(12346, 'inst-1', [{ plugHash: 1, isEnabled: true }]), // Holofoil first
      createInstance(12345, 'inst-2', [{ plugHash: 2, isEnabled: true }])  // Normal second
    ]

    const result = buildDedupedWeapon(instances)

    // Primary hash should be non-holofoil (12345)
    expect(result.variantHashes[0].hash).toBe(12345)
    expect(result.variantHashes[0].isHolofoil).toBe(false)
  })
})

describe('buildDedupedWeaponFromManifest', () => {
  beforeEach(() => {
    vi.spyOn(manifestService, 'getInventoryItem')
    vi.spyOn(manifestService, 'getDefinition')
    vi.spyOn(manifestService, 'getPlugSet')
    vi.spyOn(manifestService, 'getWeaponVariantHashes')
    vi.spyOn(manifestService, 'isHolofoilWeapon')
    vi.spyOn(weaponParser, 'getWeaponName')
    vi.spyOn(weaponParser, 'getWeaponType')
    vi.spyOn(weaponParser, 'getWeaponIcon')
    vi.spyOn(weaponParser, 'getWeaponIconWatermark')
    vi.spyOn(weaponParser, 'getWeaponSeasonName')
    vi.spyOn(weaponParser, 'getWeaponTierType')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null for non-existent weapon', () => {
    vi.mocked(manifestService.getInventoryItem).mockReturnValue(null)

    const result = buildDedupedWeaponFromManifest(99999)
    expect(result).toBeNull()
  })

  it('returns null for non-legendary/exotic weapons', () => {
    vi.mocked(manifestService.getInventoryItem).mockReturnValue({
      displayProperties: { name: 'Rare Weapon', description: '', icon: '' },
      itemType: 3,
      inventory: { tierType: 4 } // Rare
    } as any)

    const result = buildDedupedWeaponFromManifest(12345)
    expect(result).toBeNull()
  })

  it('returns null for non-weapon items', () => {
    vi.mocked(manifestService.getInventoryItem).mockReturnValue({
      displayProperties: { name: 'Armor Piece', description: '', icon: '' },
      itemType: 2, // Armor
      inventory: { tierType: 5 }
    } as any)

    const result = buildDedupedWeaponFromManifest(12345)
    expect(result).toBeNull()
  })

  it('builds deduped weapon from manifest with no owned instances', () => {
    vi.mocked(manifestService.getInventoryItem).mockReturnValue({
      displayProperties: { name: 'Austringer', description: '', icon: '/icon.png' },
      itemType: 3,
      inventory: { tierType: 5 }
    } as any)

    vi.mocked(manifestService.getWeaponVariantHashes).mockReturnValue([12345])
    vi.mocked(manifestService.isHolofoilWeapon).mockReturnValue(false)
    vi.mocked(weaponParser.getWeaponName).mockReturnValue('Austringer')
    vi.mocked(weaponParser.getWeaponType).mockReturnValue('Hand Cannon')
    vi.mocked(weaponParser.getWeaponIcon).mockReturnValue('/icon.png')
    vi.mocked(weaponParser.getWeaponIconWatermark).mockReturnValue('/watermark.png')
    vi.mocked(weaponParser.getWeaponSeasonName).mockReturnValue('Season 17')
    vi.mocked(weaponParser.getWeaponTierType).mockReturnValue(5)

    const result = buildDedupedWeaponFromManifest(12345)

    expect(result).not.toBeNull()
    expect(result!.weaponHash).toBe(12345)
    expect(result!.weaponName).toBe('Austringer')
    expect(result!.instances).toHaveLength(0)
    expect(result!.totalPerksOwned).toBe(0)
    expect(result!.completionPercentage).toBe(0)
    expect(result!.minGearTier).toBeNull()
    expect(result!.maxGearTier).toBeNull()
  })

  it('accepts legendary weapons (tierType 5)', () => {
    vi.mocked(manifestService.getInventoryItem).mockReturnValue({
      displayProperties: { name: 'Legendary Weapon', description: '', icon: '' },
      itemType: 3,
      inventory: { tierType: 5 }
    } as any)

    vi.mocked(manifestService.getWeaponVariantHashes).mockReturnValue([12345])
    vi.mocked(manifestService.isHolofoilWeapon).mockReturnValue(false)
    vi.mocked(weaponParser.getWeaponName).mockReturnValue('Legendary Weapon')
    vi.mocked(weaponParser.getWeaponType).mockReturnValue('Auto Rifle')
    vi.mocked(weaponParser.getWeaponIcon).mockReturnValue('')
    vi.mocked(weaponParser.getWeaponIconWatermark).mockReturnValue(undefined)
    vi.mocked(weaponParser.getWeaponSeasonName).mockReturnValue(undefined)
    vi.mocked(weaponParser.getWeaponTierType).mockReturnValue(5)

    const result = buildDedupedWeaponFromManifest(12345)
    expect(result).not.toBeNull()
    expect(result!.tierType).toBe(5)
  })

  it('accepts exotic weapons (tierType 6)', () => {
    vi.mocked(manifestService.getInventoryItem).mockReturnValue({
      displayProperties: { name: 'Exotic Weapon', description: '', icon: '' },
      itemType: 3,
      inventory: { tierType: 6 }
    } as any)

    vi.mocked(manifestService.getWeaponVariantHashes).mockReturnValue([12345])
    vi.mocked(manifestService.isHolofoilWeapon).mockReturnValue(false)
    vi.mocked(weaponParser.getWeaponName).mockReturnValue('Exotic Weapon')
    vi.mocked(weaponParser.getWeaponType).mockReturnValue('Pulse Rifle')
    vi.mocked(weaponParser.getWeaponIcon).mockReturnValue('')
    vi.mocked(weaponParser.getWeaponIconWatermark).mockReturnValue(undefined)
    vi.mocked(weaponParser.getWeaponSeasonName).mockReturnValue(undefined)
    vi.mocked(weaponParser.getWeaponTierType).mockReturnValue(6)

    const result = buildDedupedWeaponFromManifest(12345)
    expect(result).not.toBeNull()
    expect(result!.tierType).toBe(6)
  })

  it('includes variant hashes with holofoil detection', () => {
    vi.mocked(manifestService.getInventoryItem).mockReturnValue({
      displayProperties: { name: 'Test Weapon', description: '', icon: '' },
      itemType: 3,
      inventory: { tierType: 5 }
    } as any)

    vi.mocked(manifestService.getWeaponVariantHashes).mockReturnValue([12345, 12346])
    vi.mocked(manifestService.isHolofoilWeapon)
      .mockReturnValueOnce(false) // 12345 normal
      .mockReturnValueOnce(true)  // 12346 holofoil

    vi.mocked(weaponParser.getWeaponName).mockReturnValue('Test Weapon')
    vi.mocked(weaponParser.getWeaponType).mockReturnValue('Hand Cannon')
    vi.mocked(weaponParser.getWeaponIcon).mockReturnValue('')
    vi.mocked(weaponParser.getWeaponIconWatermark).mockReturnValue(undefined)
    vi.mocked(weaponParser.getWeaponSeasonName).mockReturnValue(undefined)
    vi.mocked(weaponParser.getWeaponTierType).mockReturnValue(5)

    const result = buildDedupedWeaponFromManifest(12345)

    expect(result).not.toBeNull()
    expect(result!.variantHashes).toHaveLength(2)
    expect(result!.hasHolofoil).toBe(true)
    // Non-holofoil should be first
    expect(result!.variantHashes[0].isHolofoil).toBe(false)
  })
})
