/**
 * Wishlist data models for DIM-compatible wishlist support
 */

/**
 * Source type for wishlists
 */
export type WishlistSourceType = 'preset' | 'user'

/**
 * Tags for categorizing rolls (DIM-compatible)
 * See: https://github.com/DestinyItemManager/DIM/wiki/Wish-Lists
 */
export type WishlistTag = 'godroll' | 'pvp' | 'pve' | 'mkb' | 'controller' | 'trash'

/**
 * Individual wishlist roll entry
 * Maps to a single dimwishlist line in DIM format
 */
export interface WishlistItem {
  id: string // UUID for internal use
  weaponHash: number // Destiny manifest item hash
  perkHashes: number[] // Required perk hashes (comma-separated in DIM format)
  notes?: string // #notes: value from DIM format
  tags?: WishlistTag[] // |tags: value from DIM format (parsed)
}

/**
 * A complete wishlist containing multiple items
 */
export interface Wishlist {
  id: string // UUID
  name: string // Display name (title: in DIM format)
  description?: string // Optional description (description: in DIM format)
  sourceType: WishlistSourceType // 'preset' or 'user'
  sourceUrl?: string // GitHub URL for presets
  author?: string // Author name for attribution
  version?: string // Content hash for update detection
  lastFetched?: string // ISO timestamp of last fetch
  lastUpdated?: string // ISO timestamp of content update
  items: WishlistItem[] // All rolls in this wishlist
  // Note: enabled state is stored separately in localStorage via wishlistStorageService
  // for performance reasons. See README "Wishlist Performance Architecture" section.
}

/**
 * Preset wishlist configuration (metadata before fetching full content)
 */
export interface PresetWishlistConfig {
  id: string
  name: string
  description: string
  githubUrl: string // Raw GitHub URL to .txt file
  author?: string
  isAdminCurated?: boolean // D3 admin-maintained list
}

/**
 * Update status for preset wishlists
 */
export interface WishlistUpdateStatus {
  wishlistId: string
  hasUpdate: boolean
  currentVersion?: string // Local stored version
  remoteVersion?: string // Remote version (if checked)
  lastChecked: string // ISO timestamp
}

/**
 * Computed stats for a wishlist (for display)
 */
export interface WishlistStats {
  itemCount: number // Total rolls
  weaponCount: number // Unique weapons covered
}

/**
 * Result of parsing a DIM wishlist file
 */
export interface ParsedWishlist {
  title?: string
  description?: string
  items: WishlistItem[]
}
