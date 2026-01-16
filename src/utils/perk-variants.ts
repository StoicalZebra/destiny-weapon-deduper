/**
 * Perk Variant Matching Utilities
 *
 * Destiny 2 perks can have multiple "variants" - different hash IDs that represent
 * the same logical perk (e.g., from different seasons or sources).
 *
 * When matching perks (e.g., checking if a selected perk matches an equipped perk),
 * we need to check ALL variants, not just exact hash equality.
 *
 * IMPORTANT: Always use these utilities when comparing perk hashes. Direct hash
 * comparison (hash1 === hash2) will fail for different variants of the same perk.
 */

import type { Perk } from '@/models/perk'

/**
 * Get all variant hashes for a perk (including the perk's own hash)
 * Returns the variantHashes array if present, otherwise just the perk hash
 */
export function getAllVariantHashes(perk: Perk): number[] {
  return perk.variantHashes || [perk.hash]
}

/**
 * Check if a perk matches any hash in a Set (checking all variants)
 *
 * Use this when you have a Perk object and want to check if any of its
 * variants are in a selection/set of hashes.
 *
 * @example
 * // Check if perk is selected (selection may contain base or enhanced hash)
 * if (isPerkInHashSet(perk, selection)) { ... }
 */
export function isPerkInHashSet(perk: Perk, hashSet: Set<number>): boolean {
  // Check canonical hash first
  if (hashSet.has(perk.hash)) return true

  // Check all variant hashes
  if (perk.variantHashes) {
    for (const variantHash of perk.variantHashes) {
      if (hashSet.has(variantHash)) return true
    }
  }

  return false
}

/**
 * Find which variant hash from a perk is present in a Set
 * Returns the matching hash, or undefined if no match
 *
 * Use this when you need to know WHICH hash matched (e.g., for deletion)
 *
 * @example
 * // Find which variant of this perk is selected, so we can remove it
 * const selectedHash = findPerkHashInSet(perk, selection)
 * if (selectedHash) selection.delete(selectedHash)
 */
export function findPerkHashInSet(perk: Perk, hashSet: Set<number>): number | undefined {
  if (hashSet.has(perk.hash)) return perk.hash

  return perk.variantHashes?.find(h => hashSet.has(h))
}

/**
 * Check if a hash matches any variant of a perk
 *
 * Use this when you have a hash (e.g., from instance.plugHash) and want
 * to check if it's any variant of a given perk.
 *
 * @example
 * // Check if equipped perk matches the selected perk (any variant)
 * if (hashMatchesPerkVariant(instance.plugHash, selectedPerk)) { ... }
 */
export function hashMatchesPerkVariant(hash: number, perk: Perk): boolean {
  const variants = getAllVariantHashes(perk)
  return variants.includes(hash)
}

/**
 * Check if any hash in an array matches any variant of a perk
 *
 * Use this when checking reusable perks on an instance.
 *
 * @example
 * // Check if any reusable perk on this socket matches the selected perk
 * if (anyHashMatchesPerkVariant(reusablePlugs, selectedPerk)) { ... }
 */
export function anyHashMatchesPerkVariant(hashes: number[], perk: Perk): boolean {
  const variants = getAllVariantHashes(perk)
  return hashes.some(h => variants.includes(h))
}

/**
 * Expand a Set of hashes to include all variants
 *
 * Use this when you need to create a "matcher" set that will match
 * any variant of the selected perks.
 *
 * @param hashSet - Set of selected hashes (may be base or enhanced)
 * @param variantsMap - Map from any hash to its full variants array
 * @returns New Set containing all variant hashes
 *
 * @example
 * // Expand selection to match any variant for highlighting
 * const expandedSelection = expandHashSetWithVariants(selection, perkVariantsMap)
 * if (expandedSelection.has(instance.plugHash)) { ... }
 */
export function expandHashSetWithVariants(
  hashSet: Set<number>,
  variantsMap: Map<number, number[]>
): Set<number> {
  const expanded = new Set<number>()

  for (const hash of hashSet) {
    expanded.add(hash)
    const variants = variantsMap.get(hash)
    if (variants) {
      for (const variant of variants) {
        expanded.add(variant)
      }
    }
  }

  return expanded
}

/**
 * Filter perks to find those with any variant selected
 *
 * Use this in instanceMatchCache to find which perks in a column are selected.
 *
 * @example
 * // Find perks in this column where any variant is selected
 * const selectedPerks = filterPerksWithSelectedVariant(column.availablePerks, selection)
 */
export function filterPerksWithSelectedVariant(perks: Perk[], selection: Set<number>): Perk[] {
  return perks.filter(perk => isPerkInHashSet(perk, selection))
}

/**
 * Check if an instance has any variant of a perk (equipped or reusable)
 *
 * @param equippedHash - The currently equipped perk hash (from socket.plugHash)
 * @param reusableHashes - Array of reusable perk hashes on this socket
 * @param perk - The perk to check for
 * @returns true if equipped or any reusable matches a variant
 */
export function instanceHasPerkVariant(
  equippedHash: number | undefined,
  reusableHashes: number[],
  perk: Perk
): boolean {
  const variants = getAllVariantHashes(perk)

  // Check equipped perk
  if (equippedHash !== undefined && variants.includes(equippedHash)) {
    return true
  }

  // Check reusable perks
  return reusableHashes.some(h => variants.includes(h))
}
