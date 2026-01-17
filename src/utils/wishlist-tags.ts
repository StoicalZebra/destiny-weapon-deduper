/**
 * Wishlist Tag Utilities
 *
 * Shared helpers for rendering wishlist tags consistently across components.
 */

import { TAG_DISPLAY_STYLES, TAG_TOOLTIPS } from '@/styles/ui-states'
import type { WishlistTag } from '@/models/wishlist'

/**
 * Get the Tailwind classes for displaying a wishlist tag badge.
 * Uses centralized styles from ui-states.ts.
 */
export function getTagDisplayClasses(tag: WishlistTag): string {
  if (tag === 'pve') return TAG_DISPLAY_STYLES.pve
  if (tag === 'pvp') return TAG_DISPLAY_STYLES.pvp
  return TAG_DISPLAY_STYLES.default
}

/**
 * Get the tooltip text for a wishlist tag.
 * Falls back to the tag name if no tooltip is defined.
 */
export function getTagTooltip(tag: WishlistTag): string {
  return TAG_TOOLTIPS[tag] || tag
}
