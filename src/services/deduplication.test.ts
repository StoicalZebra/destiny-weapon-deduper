import { describe, it, expect } from 'vitest'
import {
  normalizePerkName,
  isEnhancedPerkName,
  getColumnKind,
  isTrackerColumn,
  countOwnedPerks,
  countPossiblePerks
} from './deduplication'
import type { PerkColumn } from '@/models/deduped-weapon'
import type { Perk } from '@/models/perk'

describe('normalizePerkName', () => {
  it('removes "Enhanced" prefix and lowercases', () => {
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

describe('isEnhancedPerkName', () => {
  it('returns true for enhanced perks', () => {
    expect(isEnhancedPerkName('Enhanced Rampage')).toBe(true)
    expect(isEnhancedPerkName('Enhanced Kill Clip')).toBe(true)
  })

  it('handles case insensitivity', () => {
    expect(isEnhancedPerkName('ENHANCED Rampage')).toBe(true)
    expect(isEnhancedPerkName('enhanced rampage')).toBe(true)
  })

  it('returns false for non-enhanced perks', () => {
    expect(isEnhancedPerkName('Rampage')).toBe(false)
    expect(isEnhancedPerkName('Kill Clip')).toBe(false)
  })

  it('returns false if Enhanced is not at the start', () => {
    expect(isEnhancedPerkName('Super Enhanced Mode')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isEnhancedPerkName('')).toBe(false)
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
