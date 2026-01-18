import { describe, it, expect } from 'vitest'
import {
  parseDimWishlist,
  serializeToDimFormat,
  isDimWishlistFormat,
  getWishlistStats,
  getItemsForWeapon,
  computeContentHash,
  WILDCARD_ITEM_ID
} from './dim-wishlist-parser'
import type { WishlistItem } from '@/models/wishlist'

describe('parseDimWishlist', () => {
  describe('basic parsing', () => {
    it('parses a simple dimwishlist line', () => {
      const content = 'dimwishlist:item=1429497048&perks=3661387068,1015611457'
      const result = parseDimWishlist(content)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].weaponHash).toBe(1429497048)
      expect(result.items[0].perkHashes).toEqual([3661387068, 1015611457])
    })

    it('parses item without perks', () => {
      const content = 'dimwishlist:item=1429497048'
      const result = parseDimWishlist(content)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].weaponHash).toBe(1429497048)
      expect(result.items[0].perkHashes).toEqual([])
    })

    it('parses pipe-separated alternative perks', () => {
      const content = 'dimwishlist:item=877384&perks=460017080|3619207468,1015611457'
      const result = parseDimWishlist(content)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].perkHashes).toEqual([460017080, 3619207468, 1015611457])
    })

    it('parses complex perks with multiple pipes and commas', () => {
      const content =
        'dimwishlist:item=1323862250&perks=1482024992|3250034553|4090651448,2680121939,1820235745|3300816228'
      const result = parseDimWishlist(content)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].perkHashes).toEqual([
        1482024992,
        3250034553,
        4090651448,
        2680121939,
        1820235745,
        3300816228
      ])
    })

    it('parses multiple items', () => {
      const content = `dimwishlist:item=111&perks=1,2,3
dimwishlist:item=222&perks=4,5,6
dimwishlist:item=333&perks=7,8,9`
      const result = parseDimWishlist(content)

      expect(result.items).toHaveLength(3)
      expect(result.items[0].weaponHash).toBe(111)
      expect(result.items[1].weaponHash).toBe(222)
      expect(result.items[2].weaponHash).toBe(333)
    })
  })

  describe('metadata parsing', () => {
    it('parses title and description', () => {
      const content = `title:My Awesome Wishlist
description:The best rolls for PvP
dimwishlist:item=123&perks=456`
      const result = parseDimWishlist(content)

      expect(result.title).toBe('My Awesome Wishlist')
      expect(result.description).toBe('The best rolls for PvP')
    })

    it('only uses first title occurrence', () => {
      const content = `title:First Title
title:Second Title
dimwishlist:item=123&perks=456`
      const result = parseDimWishlist(content)

      expect(result.title).toBe('First Title')
    })

    it('handles case-insensitive title/description', () => {
      const content = `TITLE:Uppercase Title
DESCRIPTION:Uppercase Desc
dimwishlist:item=123&perks=456`
      const result = parseDimWishlist(content)

      expect(result.title).toBe('Uppercase Title')
      expect(result.description).toBe('Uppercase Desc')
    })
  })

  describe('notes parsing', () => {
    it('parses inline notes', () => {
      const content = 'dimwishlist:item=123&perks=456#notes:Great for PvP'
      const result = parseDimWishlist(content)

      expect(result.items[0].notes).toBe('Great for PvP')
    })

    it('parses block notes', () => {
      const content = `//notes:Block note for following items
dimwishlist:item=123&perks=456
dimwishlist:item=789&perks=101112`
      const result = parseDimWishlist(content)

      expect(result.items[0].notes).toBe('Block note for following items')
      expect(result.items[1].notes).toBe('Block note for following items')
    })

    it('inline notes override block notes', () => {
      const content = `//notes:Block note
dimwishlist:item=123&perks=456#notes:Inline note
dimwishlist:item=789&perks=101112`
      const result = parseDimWishlist(content)

      expect(result.items[0].notes).toBe('Inline note')
      expect(result.items[1].notes).toBe('Block note')
    })
  })

  describe('YouTube info parsing', () => {
    it('parses YouTube author, link, and timestamp from notes', () => {
      const content =
        'dimwishlist:item=123&perks=456#notes:Great roll [YT: IFrostBolt https://youtu.be/abc123 @1:23]|tags:pvp'
      const result = parseDimWishlist(content)

      expect(result.items[0].youtubeAuthor).toBe('IFrostBolt')
      expect(result.items[0].youtubeLink).toBe('https://youtu.be/abc123')
      expect(result.items[0].youtubeTimestamp).toBe('1:23')
    })

    it('parses YouTube info with full YouTube URL', () => {
      const content =
        'dimwishlist:item=123&perks=456#notes:Roll info [YT: Maven https://www.youtube.com/watch?v=xyz789 @4:09]'
      const result = parseDimWishlist(content)

      expect(result.items[0].youtubeAuthor).toBe('Maven')
      expect(result.items[0].youtubeLink).toBe('https://www.youtube.com/watch?v=xyz789')
      expect(result.items[0].youtubeTimestamp).toBe('4:09')
    })

    it('parses YouTube info with only URL (no author)', () => {
      const content =
        'dimwishlist:item=123&perks=456#notes:[YT: https://www.blueberries.gg/weapons/xyz/]'
      const result = parseDimWishlist(content)

      expect(result.items[0].youtubeAuthor).toBeUndefined()
      expect(result.items[0].youtubeLink).toBe('https://www.blueberries.gg/weapons/xyz/')
      expect(result.items[0].youtubeTimestamp).toBeUndefined()
    })

    it('parses YouTube info without timestamp', () => {
      const content =
        'dimwishlist:item=123&perks=456#notes:[YT: Legoleflash https://youtu.be/abc]'
      const result = parseDimWishlist(content)

      expect(result.items[0].youtubeAuthor).toBe('Legoleflash')
      expect(result.items[0].youtubeLink).toBe('https://youtu.be/abc')
      expect(result.items[0].youtubeTimestamp).toBeUndefined()
    })

    it('handles notes without YouTube info', () => {
      const content = 'dimwishlist:item=123&perks=456#notes:Just a regular note'
      const result = parseDimWishlist(content)

      expect(result.items[0].youtubeAuthor).toBeUndefined()
      expect(result.items[0].youtubeLink).toBeUndefined()
      expect(result.items[0].youtubeTimestamp).toBeUndefined()
    })
  })

  describe('tags parsing', () => {
    it('parses single tag', () => {
      const content = 'dimwishlist:item=123&perks=456|tags:pvp'
      const result = parseDimWishlist(content)

      expect(result.items[0].tags).toEqual(['pvp'])
    })

    it('parses multiple tags', () => {
      const content = 'dimwishlist:item=123&perks=456|tags:pvp,alt,mkb'
      const result = parseDimWishlist(content)

      expect(result.items[0].tags).toEqual(['pvp', 'alt', 'mkb'])
    })

    it('filters invalid tags', () => {
      const content = 'dimwishlist:item=123&perks=456|tags:pvp,invalid,alt'
      const result = parseDimWishlist(content)

      expect(result.items[0].tags).toEqual(['pvp', 'alt'])
    })

    it('handles tags with notes', () => {
      const content = 'dimwishlist:item=123&perks=456#notes:Great roll|tags:pvp,pve'
      const result = parseDimWishlist(content)

      expect(result.items[0].notes).toBe('Great roll')
      expect(result.items[0].tags).toEqual(['pvp', 'pve'])
    })
  })

  describe('trash list handling', () => {
    it('parses negative item hash as trash list', () => {
      const content = 'dimwishlist:item=-123&perks=456'
      const result = parseDimWishlist(content)

      expect(result.items[0].weaponHash).toBe(123) // Absolute value
      expect(result.items[0].tags).toContain('trash')
    })

    it('adds trash tag even with other tags', () => {
      const content = 'dimwishlist:item=-123&perks=456|tags:pvp'
      const result = parseDimWishlist(content)

      expect(result.items[0].tags).toContain('trash')
      expect(result.items[0].tags).toContain('pvp')
    })
  })

  describe('comments and whitespace', () => {
    it('skips comment lines', () => {
      const content = `// This is a comment
dimwishlist:item=123&perks=456
// Another comment
dimwishlist:item=789&perks=101112`
      const result = parseDimWishlist(content)

      expect(result.items).toHaveLength(2)
    })

    it('handles empty lines', () => {
      const content = `dimwishlist:item=123&perks=456

dimwishlist:item=789&perks=101112`
      const result = parseDimWishlist(content)

      expect(result.items).toHaveLength(2)
    })

    it('handles Windows line endings', () => {
      const content = 'dimwishlist:item=123&perks=456\r\ndimwishlist:item=789&perks=101112'
      const result = parseDimWishlist(content)

      expect(result.items).toHaveLength(2)
    })

    it('trims whitespace from lines', () => {
      const content = '  dimwishlist:item=123&perks=456  '
      const result = parseDimWishlist(content)

      expect(result.items).toHaveLength(1)
    })
  })

  describe('case insensitivity', () => {
    it('handles uppercase DIMWISHLIST', () => {
      const content = 'DIMWISHLIST:item=123&perks=456'
      const result = parseDimWishlist(content)

      expect(result.items).toHaveLength(1)
    })

    it('handles mixed case', () => {
      const content = 'DimWishList:item=123&perks=456'
      const result = parseDimWishlist(content)

      expect(result.items).toHaveLength(1)
    })
  })
})

describe('serializeToDimFormat', () => {
  it('serializes basic item', () => {
    const items: WishlistItem[] = [
      {
        id: 'test-1',
        weaponHash: 123,
        perkHashes: [456, 789]
      }
    ]
    const result = serializeToDimFormat(items)

    expect(result).toBe('dimwishlist:item=123&perks=456,789')
  })

  it('serializes item with notes', () => {
    const items: WishlistItem[] = [
      {
        id: 'test-1',
        weaponHash: 123,
        perkHashes: [456],
        notes: 'Great roll'
      }
    ]
    const result = serializeToDimFormat(items)

    expect(result).toBe('dimwishlist:item=123&perks=456#notes:Great roll')
  })

  it('serializes item with tags', () => {
    const items: WishlistItem[] = [
      {
        id: 'test-1',
        weaponHash: 123,
        perkHashes: [456],
        tags: ['pvp', 'alt']
      }
    ]
    const result = serializeToDimFormat(items)

    expect(result).toBe('dimwishlist:item=123&perks=456|tags:pvp,alt')
  })

  it('serializes trash item with negative hash', () => {
    const items: WishlistItem[] = [
      {
        id: 'test-1',
        weaponHash: 123,
        perkHashes: [456],
        tags: ['trash', 'pvp']
      }
    ]
    const result = serializeToDimFormat(items)

    // Trash tag encoded in negative hash, not in tags list
    expect(result).toBe('dimwishlist:item=-123&perks=456|tags:pvp')
  })

  it('includes title and description', () => {
    const items: WishlistItem[] = [
      {
        id: 'test-1',
        weaponHash: 123,
        perkHashes: [456]
      }
    ]
    const result = serializeToDimFormat(items, {
      title: 'My Wishlist',
      description: 'The best rolls'
    })

    expect(result).toContain('title:My Wishlist')
    expect(result).toContain('description:The best rolls')
    expect(result).toContain('dimwishlist:item=123&perks=456')
  })

  it('handles empty perks array', () => {
    const items: WishlistItem[] = [
      {
        id: 'test-1',
        weaponHash: 123,
        perkHashes: []
      }
    ]
    const result = serializeToDimFormat(items)

    expect(result).toBe('dimwishlist:item=123')
  })

  it('outputs multiple lines for multi-hash weapons when getVariantHashes provided', () => {
    const items: WishlistItem[] = [
      {
        id: 'test-1',
        weaponHash: 1111,
        perkHashes: [456, 789],
        tags: ['pvp']
      }
    ]
    // Mock variant lookup returning 2 hashes
    const getVariantHashes = (hash: number) => (hash === 1111 ? [1111, 2222] : [hash])

    const result = serializeToDimFormat(items, { getVariantHashes })

    // Should output 2 lines - one for each variant hash
    const lines = result.split('\n').filter((l) => l.startsWith('dimwishlist:'))
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('dimwishlist:item=1111&perks=456,789|tags:pvp')
    expect(lines[1]).toBe('dimwishlist:item=2222&perks=456,789|tags:pvp')
  })

  it('adds blank lines between weapon groups', () => {
    const items: WishlistItem[] = [
      { id: 'test-1', weaponHash: 111, perkHashes: [1] },
      { id: 'test-2', weaponHash: 111, perkHashes: [2] },
      { id: 'test-3', weaponHash: 222, perkHashes: [3] }
    ]
    const result = serializeToDimFormat(items)

    // Should have blank line between weapon 111 and 222
    const lines = result.split('\n')
    expect(lines).toEqual([
      'dimwishlist:item=111&perks=1',
      'dimwishlist:item=111&perks=2',
      '', // blank line between weapons
      'dimwishlist:item=222&perks=3'
    ])
  })

  it('groups items by canonical hash when variants exist', () => {
    // Items stored under different variant hashes should group together
    const items: WishlistItem[] = [
      { id: 'test-1', weaponHash: 1111, perkHashes: [1] }, // normal variant
      { id: 'test-2', weaponHash: 2222, perkHashes: [2] } // holofoil variant (same weapon)
    ]
    // Variant lookup returns same variants for both hashes
    const getVariantHashes = (hash: number) =>
      hash === 1111 || hash === 2222 ? [1111, 2222] : [hash]

    const result = serializeToDimFormat(items, { getVariantHashes })

    const lines = result.split('\n').filter((l) => l.length > 0)
    // Both items should be in same group (no blank line between them)
    // Each item outputs 2 lines (one per variant)
    expect(lines).toHaveLength(4)
    // All 4 lines should be consecutive (grouped together)
    expect(result).not.toContain('\n\n')
  })

  it('adds weapon name comments when getWeaponName is provided', () => {
    const items: WishlistItem[] = [
      { id: 'test-1', weaponHash: 111, perkHashes: [1], youtubeAuthor: 'Maven' },
      { id: 'test-2', weaponHash: 222, perkHashes: [2], youtubeAuthor: 'IFrostBolt' }
    ]
    const result = serializeToDimFormat(items, {
      getWeaponName: (hash) => (hash === 111 ? 'Riptide' : 'Eyasluna'),
      getWeaponType: (hash) => (hash === 111 ? 'Fusion Rifle' : 'Hand Cannon')
    })

    expect(result).toContain('// ===== RIPTIDE (Fusion Rifle) =====')
    expect(result).toContain('// Maven')
    expect(result).toContain('// ===== EYASLUNA (Hand Cannon) =====')
    expect(result).toContain('// IFrostBolt')
  })

  it('groups items by contributor within each weapon', () => {
    const items: WishlistItem[] = [
      { id: 'test-1', weaponHash: 111, perkHashes: [1], youtubeAuthor: 'Maven' },
      { id: 'test-2', weaponHash: 111, perkHashes: [2], youtubeAuthor: 'IFrostBolt' },
      { id: 'test-3', weaponHash: 111, perkHashes: [3], youtubeAuthor: 'Maven' }
    ]
    const result = serializeToDimFormat(items, {
      getWeaponName: () => 'TestWeapon'
    })

    const lines = result.split('\n')
    // Maven items should be grouped together
    const mavenIndex1 = lines.findIndex((l) => l.includes('perks=1'))
    const mavenIndex2 = lines.findIndex((l) => l.includes('perks=3'))

    // Maven items should be adjacent (after the // Maven comment)
    expect(Math.abs(mavenIndex1 - mavenIndex2)).toBe(1)
  })

  it('groups identical rolls with different hashes together', () => {
    const items: WishlistItem[] = [
      { id: 'test-1', weaponHash: 111, perkHashes: [1, 2], notes: 'Roll A', youtubeAuthor: 'Maven' },
      { id: 'test-2', weaponHash: 111, perkHashes: [3, 4], notes: 'Roll B', youtubeAuthor: 'Maven' }
    ]
    // Simulate multi-hash weapon
    const getVariantHashes = (hash: number) => (hash === 111 ? [111, 222] : [hash])

    const result = serializeToDimFormat(items, {
      getVariantHashes,
      getWeaponName: () => 'TestWeapon'
    })

    const lines = result.split('\n').filter((l) => l.startsWith('dimwishlist:'))

    // Roll A's two hashes should be adjacent, then Roll B's two hashes
    expect(lines[0]).toContain('perks=1,2')
    expect(lines[0]).toContain('item=111')
    expect(lines[1]).toContain('perks=1,2')
    expect(lines[1]).toContain('item=222')
    expect(lines[2]).toContain('perks=3,4')
    expect(lines[2]).toContain('item=111')
    expect(lines[3]).toContain('perks=3,4')
    expect(lines[3]).toContain('item=222')
  })

  it('uses Unknown for items without youtubeAuthor', () => {
    const items: WishlistItem[] = [
      { id: 'test-1', weaponHash: 111, perkHashes: [1] }
    ]
    const result = serializeToDimFormat(items, {
      getWeaponName: () => 'TestWeapon'
    })

    expect(result).toContain('// Unknown')
  })

  it('sorts weapons alphabetically by name', () => {
    const items: WishlistItem[] = [
      { id: 'test-1', weaponHash: 333, perkHashes: [1] },
      { id: 'test-2', weaponHash: 111, perkHashes: [2] },
      { id: 'test-3', weaponHash: 222, perkHashes: [3] }
    ]
    // Map hashes to names: 333 -> Riptide, 111 -> Ace, 222 -> Beloved
    const nameMap: Record<number, string> = {
      333: 'Riptide',
      111: 'Ace of Spades',
      222: 'Beloved'
    }
    const result = serializeToDimFormat(items, {
      getWeaponName: (hash) => nameMap[hash]
    })

    const headerLines = result.split('\n').filter((l) => l.startsWith('// ====='))
    expect(headerLines[0]).toContain('ACE OF SPADES') // Alphabetically first
    expect(headerLines[1]).toContain('BELOVED')
    expect(headerLines[2]).toContain('RIPTIDE') // Alphabetically last
  })

  it('deduplicates identical rolls within a contributor', () => {
    // Simulate source data that has duplicate entries (same perks/notes) for different hashes
    const items: WishlistItem[] = [
      { id: 'test-1', weaponHash: 111, perkHashes: [1, 2], notes: 'Same roll', youtubeAuthor: 'Maven' },
      { id: 'test-2', weaponHash: 222, perkHashes: [1, 2], notes: 'Same roll', youtubeAuthor: 'Maven' }, // Duplicate roll (different hash)
      { id: 'test-3', weaponHash: 111, perkHashes: [1, 2], notes: 'Same roll', youtubeAuthor: 'Maven' }, // Exact duplicate
      { id: 'test-4', weaponHash: 111, perkHashes: [3, 4], notes: 'Different roll', youtubeAuthor: 'Maven' }
    ]
    // Both 111 and 222 are variants of the same weapon
    const getVariantHashes = () => [111, 222]

    const result = serializeToDimFormat(items, {
      getVariantHashes,
      getWeaponName: () => 'TestWeapon'
    })

    const dimLines = result.split('\n').filter((l) => l.startsWith('dimwishlist:'))

    // Should have 4 lines total: 2 unique rolls × 2 variant hashes
    // NOT 8 lines (4 items × 2 variants)
    expect(dimLines).toHaveLength(4)

    // First roll should appear twice (once per variant hash)
    const sameRollLines = dimLines.filter((l) => l.includes('perks=1,2'))
    expect(sameRollLines).toHaveLength(2)
    expect(sameRollLines[0]).toContain('item=111')
    expect(sameRollLines[1]).toContain('item=222')

    // Second roll should appear twice (once per variant hash)
    const diffRollLines = dimLines.filter((l) => l.includes('perks=3,4'))
    expect(diffRollLines).toHaveLength(2)
  })
})

describe('isDimWishlistFormat', () => {
  it('returns true for valid content', () => {
    expect(isDimWishlistFormat('dimwishlist:item=123&perks=456')).toBe(true)
  })

  it('returns false for invalid content', () => {
    expect(isDimWishlistFormat('random text')).toBe(false)
    expect(isDimWishlistFormat('title:My List')).toBe(false)
    expect(isDimWishlistFormat('')).toBe(false)
  })

  it('returns true even if dimwishlist is not first line', () => {
    const content = `title:My List
description:Test
dimwishlist:item=123&perks=456`
    expect(isDimWishlistFormat(content)).toBe(true)
  })
})

describe('getWishlistStats', () => {
  it('counts items and unique weapons', () => {
    const items: WishlistItem[] = [
      { id: '1', weaponHash: 111, perkHashes: [1] },
      { id: '2', weaponHash: 111, perkHashes: [2] },
      { id: '3', weaponHash: 222, perkHashes: [3] },
      { id: '4', weaponHash: 333, perkHashes: [4] }
    ]
    const stats = getWishlistStats(items)

    expect(stats.itemCount).toBe(4)
    expect(stats.weaponCount).toBe(3)
  })

  it('handles empty array', () => {
    const stats = getWishlistStats([])

    expect(stats.itemCount).toBe(0)
    expect(stats.weaponCount).toBe(0)
  })
})

describe('getItemsForWeapon', () => {
  const items: WishlistItem[] = [
    { id: '1', weaponHash: 111, perkHashes: [1] },
    { id: '2', weaponHash: 222, perkHashes: [2] },
    { id: '3', weaponHash: 111, perkHashes: [3] },
    { id: '4', weaponHash: WILDCARD_ITEM_ID, perkHashes: [4] }
  ]

  it('returns items for specific weapon', () => {
    const result = getItemsForWeapon(items, 111)

    expect(result).toHaveLength(3) // 2 for weapon 111 + 1 wildcard
    expect(result.map((i) => i.id)).toContain('1')
    expect(result.map((i) => i.id)).toContain('3')
    expect(result.map((i) => i.id)).toContain('4') // Wildcard
  })

  it('includes wildcard items', () => {
    const result = getItemsForWeapon(items, 999)

    expect(result).toHaveLength(1) // Only wildcard
    expect(result[0].id).toBe('4')
  })

  it('returns empty for non-matching weapon without wildcard', () => {
    const itemsNoWildcard = items.filter((i) => i.weaponHash !== WILDCARD_ITEM_ID)
    const result = getItemsForWeapon(itemsNoWildcard, 999)

    expect(result).toHaveLength(0)
  })
})

describe('computeContentHash', () => {
  it('returns consistent hash for same content', async () => {
    const content = 'dimwishlist:item=123&perks=456'
    const hash1 = await computeContentHash(content)
    const hash2 = await computeContentHash(content)

    expect(hash1).toBe(hash2)
  })

  it('returns different hash for different content', async () => {
    const hash1 = await computeContentHash('content1')
    const hash2 = await computeContentHash('content2')

    expect(hash1).not.toBe(hash2)
  })

  it('returns hex string', async () => {
    const hash = await computeContentHash('test')

    expect(hash).toMatch(/^[0-9a-f]+$/)
    expect(hash.length).toBe(64) // SHA-256 produces 64 hex chars
  })
})

describe('round-trip parsing and serialization', () => {
  it('preserves data through parse -> serialize -> parse', () => {
    const original = `title:Test Wishlist
description:Round-trip test
dimwishlist:item=123&perks=456,789#notes:Great roll|tags:pvp,alt
dimwishlist:item=456&perks=111,222`

    const parsed1 = parseDimWishlist(original)
    const serialized = serializeToDimFormat(parsed1.items, {
      title: parsed1.title,
      description: parsed1.description
    })
    const parsed2 = parseDimWishlist(serialized)

    expect(parsed2.title).toBe(parsed1.title)
    expect(parsed2.description).toBe(parsed1.description)
    expect(parsed2.items).toHaveLength(parsed1.items.length)

    // Compare item data (excluding generated IDs)
    for (let i = 0; i < parsed1.items.length; i++) {
      expect(parsed2.items[i].weaponHash).toBe(parsed1.items[i].weaponHash)
      expect(parsed2.items[i].perkHashes).toEqual(parsed1.items[i].perkHashes)
      expect(parsed2.items[i].notes).toBe(parsed1.items[i].notes)
      expect(parsed2.items[i].tags).toEqual(parsed1.items[i].tags)
    }
  })
})
