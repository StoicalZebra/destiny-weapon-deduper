/**
 * Wishlist sorting utilities for consistent tag-based ordering
 * Used across WishlistDetailView, WeaponDetailUnified, and other components
 */

import type { WishlistItem, WishlistTag } from '@/models/wishlist'

/**
 * Tag priority for sorting (lower = higher priority)
 * Order: PVE > PVE+ALT > PVP > PVP+ALT > others
 */
const TAG_PRIORITY: Record<string, number> = {
  pve: 0,
  pvp: 2,
  alt: 10, // Will be repositioned based on context
  controller: 20,
  mkb: 21,
  trash: 99,
}

/**
 * Get tag-based priority for sorting items
 * Priority order: PVE > PVE+ALT > PVP > PVP+ALT > others
 */
export function getItemTagPriority(item: WishlistItem): number {
  const tags = item.tags || []
  const hasPve = tags.includes('pve')
  const hasPvp = tags.includes('pvp')
  const hasAlt = tags.includes('alt')

  if (hasPve && !hasAlt) return 0 // PVE
  if (hasPve && hasAlt) return 1 // PVE ALT
  if (hasPvp && !hasAlt) return 2 // PVP
  if (hasPvp && hasAlt) return 3 // PVP ALT
  return 4 // No matching tags
}

/**
 * Sort wishlist items by tag priority
 * Returns a new sorted array (does not mutate original)
 */
export function sortItemsByTagPriority<T extends WishlistItem>(items: T[]): T[] {
  return [...items].sort((a, b) => getItemTagPriority(a) - getItemTagPriority(b))
}

/**
 * Sort tags for display: PVE first, then PVP, then ALT repositioned based on context
 * Returns a new sorted array (does not mutate original)
 */
export function sortTagsForDisplay(tags: WishlistTag[] | undefined): WishlistTag[] {
  if (!tags || tags.length === 0) return []

  return [...tags].sort((a, b) => {
    const hasPve = tags.includes('pve')
    const hasPvp = tags.includes('pvp')

    // Position ALT right after PVE or PVP
    let aPriority = TAG_PRIORITY[a] ?? 50
    let bPriority = TAG_PRIORITY[b] ?? 50

    if (a === 'alt') aPriority = hasPve ? 1 : hasPvp ? 3 : 10
    if (b === 'alt') bPriority = hasPve ? 1 : hasPvp ? 3 : 10

    return aPriority - bPriority
  })
}
