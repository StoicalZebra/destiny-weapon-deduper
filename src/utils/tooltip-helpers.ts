/**
 * Centralized tooltip helpers for consistent tooltip behavior across components.
 * Used by Perk Matrix, Instance Perk Grid, and other perk display components.
 */

// ============ TOOLTIP STRING CONSTANTS ============

export const TOOLTIP_STRINGS = {
  ENHANCED_PERK: 'Enhanced Perk',
  ENHANCED_MASTERWORK: 'Enhanced Masterwork'
} as const

// ============ WISHLIST TOOLTIP HELPERS ============

/**
 * Format wishlist names for badge tooltip (standalone, no leading newlines).
 * Use this for the `title` attribute on wishlist indicator badges.
 *
 * @example getWishlistBadgeTooltip(['Voltron', 'My Rolls']) // "Recommended by: Voltron, My Rolls"
 */
export function getWishlistBadgeTooltip(wishlistNames: string[] | undefined): string {
  if (!wishlistNames || wishlistNames.length === 0) return ''
  return `Recommended by: ${wishlistNames.join(', ')}`
}

/**
 * Format wishlist names as a tooltip suffix (with leading newlines for appending).
 * Use this when appending wishlist info to an existing perk description tooltip.
 *
 * @example formatWishlistTooltipSuffix(['Voltron']) // "\n\nRecommended by: Voltron"
 */
export function formatWishlistTooltipSuffix(wishlistNames: string[] | undefined): string {
  if (!wishlistNames || wishlistNames.length === 0) return ''
  return `\n\nRecommended by: ${wishlistNames.join(', ')}`
}
