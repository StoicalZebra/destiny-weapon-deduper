/**
 * Wishlist Edit Permission Utilities
 *
 * Wishlists are editable based on their size (roll count).
 * Large wishlists (>500 rolls) would cause performance issues in the UI,
 * so they're view-only with a link to GitHub.
 */

import type { Wishlist } from '@/models/wishlist'
import { MAX_EDITABLE_ROLLS, getWishlistRollCount } from '@/models/wishlist'

/**
 * Check if a wishlist is editable based on its size
 * - User wishlists are always editable (they can't exceed limit via UI)
 * - Premade wishlists are editable if under 500 rolls
 * - Large premade wishlists are view-only (link to GitHub)
 */
export function isWishlistEditable(wishlist: Pick<Wishlist, 'sourceType' | 'items'>): boolean {
  // User wishlists are always editable
  if (wishlist.sourceType === 'user') return true

  // Premade wishlists: editable if under size limit
  const rollCount = getWishlistRollCount(wishlist as Wishlist)
  return rollCount <= MAX_EDITABLE_ROLLS
}

/**
 * Check if a wishlist is too large for in-app viewing/editing
 */
export function isWishlistTooLarge(wishlist: Pick<Wishlist, 'items'>): boolean {
  return getWishlistRollCount(wishlist as Wishlist) > MAX_EDITABLE_ROLLS
}
