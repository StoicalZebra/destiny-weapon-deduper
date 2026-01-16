import { describe, it, expect } from 'vitest'
import {
  getItemTagPriority,
  sortItemsByTagPriority,
  sortTagsForDisplay,
} from './wishlist-sorting'
import type { WishlistItem } from '@/models/wishlist'

// Helper to create a minimal WishlistItem for testing
function createItem(tags: WishlistItem['tags']): WishlistItem {
  return {
    id: 'test',
    weaponHash: 12345,
    perkHashes: [1, 2, 3],
    tags,
  }
}

describe('getItemTagPriority', () => {
  it('returns 0 for PVE without ALT', () => {
    expect(getItemTagPriority(createItem(['pve']))).toBe(0)
    expect(getItemTagPriority(createItem(['pve', 'controller']))).toBe(0)
  })

  it('returns 1 for PVE with ALT', () => {
    expect(getItemTagPriority(createItem(['pve', 'alt']))).toBe(1)
    expect(getItemTagPriority(createItem(['alt', 'pve']))).toBe(1)
  })

  it('returns 2 for PVP without ALT', () => {
    expect(getItemTagPriority(createItem(['pvp']))).toBe(2)
    expect(getItemTagPriority(createItem(['pvp', 'mkb']))).toBe(2)
  })

  it('returns 3 for PVP with ALT', () => {
    expect(getItemTagPriority(createItem(['pvp', 'alt']))).toBe(3)
    expect(getItemTagPriority(createItem(['alt', 'pvp']))).toBe(3)
  })

  it('returns 4 for items without PVE/PVP tags', () => {
    expect(getItemTagPriority(createItem([]))).toBe(4)
    expect(getItemTagPriority(createItem(undefined))).toBe(4)
    expect(getItemTagPriority(createItem(['alt']))).toBe(4)
    expect(getItemTagPriority(createItem(['controller', 'mkb']))).toBe(4)
  })
})

describe('sortItemsByTagPriority', () => {
  it('sorts items by tag priority', () => {
    const items = [
      createItem(['pvp', 'alt']), // priority 3
      createItem(['pve']), // priority 0
      createItem(['pvp']), // priority 2
      createItem(['pve', 'alt']), // priority 1
      createItem([]), // priority 4
    ]

    const sorted = sortItemsByTagPriority(items)

    expect(sorted[0].tags).toEqual(['pve'])
    expect(sorted[1].tags).toEqual(['pve', 'alt'])
    expect(sorted[2].tags).toEqual(['pvp'])
    expect(sorted[3].tags).toEqual(['pvp', 'alt'])
    expect(sorted[4].tags).toEqual([])
  })

  it('does not mutate original array', () => {
    const items = [createItem(['pvp']), createItem(['pve'])]
    const sorted = sortItemsByTagPriority(items)

    expect(items[0].tags).toEqual(['pvp'])
    expect(sorted[0].tags).toEqual(['pve'])
  })
})

describe('sortTagsForDisplay', () => {
  it('returns empty array for undefined or empty tags', () => {
    expect(sortTagsForDisplay(undefined)).toEqual([])
    expect(sortTagsForDisplay([])).toEqual([])
  })

  it('puts PVE before PVP', () => {
    expect(sortTagsForDisplay(['pvp', 'pve'])).toEqual(['pve', 'pvp'])
  })

  it('positions ALT right after PVE when PVE is present', () => {
    expect(sortTagsForDisplay(['alt', 'pve'])).toEqual(['pve', 'alt'])
    expect(sortTagsForDisplay(['controller', 'alt', 'pve'])).toEqual(['pve', 'alt', 'controller'])
  })

  it('positions ALT right after PVP when PVP is present (no PVE)', () => {
    expect(sortTagsForDisplay(['alt', 'pvp'])).toEqual(['pvp', 'alt'])
    expect(sortTagsForDisplay(['mkb', 'alt', 'pvp'])).toEqual(['pvp', 'alt', 'mkb'])
  })

  it('puts controller before mkb', () => {
    expect(sortTagsForDisplay(['mkb', 'controller'])).toEqual(['controller', 'mkb'])
  })

  it('puts trash at the end', () => {
    expect(sortTagsForDisplay(['trash', 'pve'])).toEqual(['pve', 'trash'])
    expect(sortTagsForDisplay(['trash', 'pvp', 'alt'])).toEqual(['pvp', 'alt', 'trash'])
  })
})
