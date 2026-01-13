/**
 * Admin Mode Utilities
 *
 * Admin mode is enabled via VITE_ADMIN_MODE=true in .env.local
 * This allows editing of admin-curated preset wishlists (like StoicalZebra)
 */

import type { Wishlist } from '@/models/wishlist'

/**
 * IDs of preset wishlists that are admin-curated and can be edited in admin mode
 */
const ADMIN_CURATED_PRESET_IDS = ['stoicalzebra']

/**
 * Check if admin mode is enabled
 */
export function isAdminMode(): boolean {
  return import.meta.env.VITE_ADMIN_MODE === 'true'
}

/**
 * Check if a wishlist is editable by the current user
 * - User wishlists are always editable
 * - Admin-curated presets are editable only in admin mode
 * - Other presets are never editable
 */
export function isWishlistEditable(wishlist: Pick<Wishlist, 'sourceType' | 'id'>): boolean {
  // User wishlists are always editable
  if (wishlist.sourceType === 'user') return true

  // Presets require admin mode + being in the admin-curated list
  if (wishlist.sourceType === 'preset') {
    if (!isAdminMode()) return false
    return ADMIN_CURATED_PRESET_IDS.includes(wishlist.id)
  }

  return false
}
