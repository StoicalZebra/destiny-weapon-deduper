import { describe, it, expect } from 'vitest'
import type { Perk } from '@/models/perk'
import {
  getAllVariantHashes,
  isPerkInHashSet,
  findPerkHashInSet,
  hashMatchesPerkVariant,
  anyHashMatchesPerkVariant,
  expandHashSetWithVariants,
  filterPerksWithSelectedVariant,
  instanceHasPerkVariant
} from './perk-variants'

// Mock perks for testing
const basePerk: Perk = {
  hash: 1000,
  name: 'Under Pressure',
  description: 'Base version',
  icon: '/icon.png',
  isOwned: true,
  variantHashes: [1000, 1001] // variants for grouping
}

const singleVariantPerk: Perk = {
  hash: 2001,
  name: 'Single Variant Perk',
  description: 'Only one variant',
  icon: '/icon.png',
  isOwned: true,
  variantHashes: [2001]
}

const noVariantsPerk: Perk = {
  hash: 3000,
  name: 'Simple Perk',
  description: 'No variants',
  icon: '/icon.png',
  isOwned: true
  // No variantHashes - should fallback to [hash]
}

describe('perk-variants utilities', () => {
  describe('getAllVariantHashes', () => {
    it('returns variantHashes when present', () => {
      expect(getAllVariantHashes(basePerk)).toEqual([1000, 1001])
    })

    it('returns [hash] when variantHashes not present', () => {
      expect(getAllVariantHashes(noVariantsPerk)).toEqual([3000])
    })
  })

  describe('isPerkInHashSet', () => {
    it('returns true when canonical hash is in set', () => {
      const set = new Set([1000])
      expect(isPerkInHashSet(basePerk, set)).toBe(true)
    })

    it('returns true when enhanced variant is in set', () => {
      const set = new Set([1001]) // enhanced hash
      expect(isPerkInHashSet(basePerk, set)).toBe(true)
    })

    it('returns false when no variant is in set', () => {
      const set = new Set([9999])
      expect(isPerkInHashSet(basePerk, set)).toBe(false)
    })

    it('returns false for empty set', () => {
      const set = new Set<number>()
      expect(isPerkInHashSet(basePerk, set)).toBe(false)
    })

    it('works with perks without variantHashes', () => {
      const set = new Set([3000])
      expect(isPerkInHashSet(noVariantsPerk, set)).toBe(true)
    })
  })

  describe('findPerkHashInSet', () => {
    it('returns canonical hash when it is in set', () => {
      const set = new Set([1000, 5000])
      expect(findPerkHashInSet(basePerk, set)).toBe(1000)
    })

    it('returns variant hash when canonical not in set but variant is', () => {
      const set = new Set([1001, 5000]) // enhanced hash
      expect(findPerkHashInSet(basePerk, set)).toBe(1001)
    })

    it('returns undefined when no variant is in set', () => {
      const set = new Set([9999])
      expect(findPerkHashInSet(basePerk, set)).toBeUndefined()
    })

    it('prefers canonical hash over variant', () => {
      const set = new Set([1000, 1001]) // both in set
      expect(findPerkHashInSet(basePerk, set)).toBe(1000) // returns canonical first
    })
  })

  describe('hashMatchesPerkVariant', () => {
    it('returns true for base hash', () => {
      expect(hashMatchesPerkVariant(1000, basePerk)).toBe(true)
    })

    it('returns true for enhanced hash', () => {
      expect(hashMatchesPerkVariant(1001, basePerk)).toBe(true)
    })

    it('returns false for unrelated hash', () => {
      expect(hashMatchesPerkVariant(9999, basePerk)).toBe(false)
    })

    it('works with perks without variantHashes', () => {
      expect(hashMatchesPerkVariant(3000, noVariantsPerk)).toBe(true)
      expect(hashMatchesPerkVariant(9999, noVariantsPerk)).toBe(false)
    })
  })

  describe('anyHashMatchesPerkVariant', () => {
    it('returns true when one hash matches', () => {
      expect(anyHashMatchesPerkVariant([5000, 1001, 6000], basePerk)).toBe(true)
    })

    it('returns false when no hash matches', () => {
      expect(anyHashMatchesPerkVariant([5000, 6000, 7000], basePerk)).toBe(false)
    })

    it('returns false for empty array', () => {
      expect(anyHashMatchesPerkVariant([], basePerk)).toBe(false)
    })
  })

  describe('expandHashSetWithVariants', () => {
    it('expands hashes to include all variants', () => {
      const hashSet = new Set([1000]) // base hash
      const variantsMap = new Map([
        [1000, [1000, 1001]],
        [1001, [1000, 1001]]
      ])

      const expanded = expandHashSetWithVariants(hashSet, variantsMap)

      expect(expanded.has(1000)).toBe(true)
      expect(expanded.has(1001)).toBe(true)
    })

    it('handles hashes not in variantsMap', () => {
      const hashSet = new Set([9999])
      const variantsMap = new Map<number, number[]>()

      const expanded = expandHashSetWithVariants(hashSet, variantsMap)

      expect(expanded.has(9999)).toBe(true)
      expect(expanded.size).toBe(1)
    })

    it('handles multiple selected hashes', () => {
      const hashSet = new Set([1000, 2000])
      const variantsMap = new Map([
        [1000, [1000, 1001]],
        [2000, [2000, 2001]]
      ])

      const expanded = expandHashSetWithVariants(hashSet, variantsMap)

      expect(expanded.size).toBe(4)
      expect(expanded.has(1000)).toBe(true)
      expect(expanded.has(1001)).toBe(true)
      expect(expanded.has(2000)).toBe(true)
      expect(expanded.has(2001)).toBe(true)
    })
  })

  describe('filterPerksWithSelectedVariant', () => {
    const perks = [basePerk, singleVariantPerk, noVariantsPerk]

    it('filters perks where any variant is selected', () => {
      const selection = new Set([1001]) // variant of basePerk
      const result = filterPerksWithSelectedVariant(perks, selection)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe(basePerk)
    })

    it('returns empty array when no perks match', () => {
      const selection = new Set([9999])
      const result = filterPerksWithSelectedVariant(perks, selection)

      expect(result).toHaveLength(0)
    })

    it('returns multiple perks when multiple match', () => {
      const selection = new Set([1000, 3000])
      const result = filterPerksWithSelectedVariant(perks, selection)

      expect(result).toHaveLength(2)
      expect(result).toContain(basePerk)
      expect(result).toContain(noVariantsPerk)
    })
  })

  describe('instanceHasPerkVariant', () => {
    it('returns true when equipped hash matches variant', () => {
      expect(instanceHasPerkVariant(1001, [], basePerk)).toBe(true) // enhanced equipped
    })

    it('returns true when reusable hash matches variant', () => {
      expect(instanceHasPerkVariant(9999, [5000, 1000], basePerk)).toBe(true) // base in reusables
    })

    it('returns false when neither equipped nor reusable matches', () => {
      expect(instanceHasPerkVariant(9999, [5000, 6000], basePerk)).toBe(false)
    })

    it('returns false when equipped is undefined and no reusable matches', () => {
      expect(instanceHasPerkVariant(undefined, [5000], basePerk)).toBe(false)
    })

    it('handles perks without variantHashes', () => {
      expect(instanceHasPerkVariant(3000, [], noVariantsPerk)).toBe(true)
      expect(instanceHasPerkVariant(9999, [], noVariantsPerk)).toBe(false)
    })
  })
})
