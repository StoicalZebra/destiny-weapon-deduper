/**
 * Wishlist data models for DIM-compatible wishlist support
 */

/**
 * Source type for wishlists
 * - 'preset': Premade wishlists from GitHub (shown as "Premade" in UI)
 * - 'user': Custom wishlists created by the user (shown as "Custom" in UI)
 */
export type WishlistSourceType = 'preset' | 'user'

/**
 * Tags for categorizing rolls
 * Note: DIM ignores |tags: but we use them for our UI. See README for details.
 * - pvp/pve: Activity context
 * - mkb/controller: Input method
 * - alt: Alternative/budget roll (not the "god roll" but still good)
 * - trash: Mark as undesirable (uses negative hash in DIM export)
 */
export type WishlistTag = 'pvp' | 'pve' | 'mkb' | 'controller' | 'alt' | 'trash'

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
  // YouTube reference fields (embedded in notes on DIM export)
  youtubeLink?: string // Full YouTube URL
  youtubeAuthor?: string // Creator/channel name
  youtubeTimestamp?: string // Timestamp in video (e.g., "2:34")
  // Metadata for attribution and tracking
  createdBy?: string // Bungie display name (e.g., "Guardian#1234")
  updatedAt?: string // ISO timestamp of last update
  // Multi-hash variant support: links entries for same roll across weapon variants
  // When a weapon has multiple hashes (e.g., holofoil + normal), we create one entry
  // per hash, all sharing the same variantGroupId for coordinated update/delete
  variantGroupId?: string // UUID linking related variant entries
}

/**
 * A complete wishlist containing multiple items
 */
export interface Wishlist {
  id: string // UUID
  name: string // Display name (title: in DIM format)
  description?: string // Optional description (description: in DIM format)
  sourceType: WishlistSourceType // 'preset' (premade) or 'user' (custom)
  sourceUrl?: string // GitHub URL for premade wishlists
  author?: string // Author name for attribution
  version?: string // Content hash for update detection
  lastFetched?: string // ISO timestamp of last fetch
  lastUpdated?: string // ISO timestamp of content update
  githubCommitDate?: string // ISO timestamp of last GitHub commit (for presets)
  items: WishlistItem[] // All rolls in this wishlist
  // Note: enabled state is stored separately in localStorage via wishlistStorageService
  // for performance reasons. See README "Wishlist Performance Architecture" section.
}

/**
 * Maximum number of rolls a wishlist can have for in-app editing.
 * Wishlists exceeding this limit are view-only with GitHub link.
 */
export const MAX_EDITABLE_ROLLS = 500

/**
 * Get the roll count for a wishlist (items.length)
 * Used for size-based edit permissions
 */
export function getWishlistRollCount(wishlist: Wishlist): number {
  return wishlist.items.length
}

/**
 * Premade wishlist configuration (metadata before fetching full content)
 * Note: Called "Preset" internally for storage compatibility, shown as "Premade" in UI
 */
export interface PresetWishlistConfig {
  id: string
  name: string
  description: string
  githubUrl?: string // Raw GitHub URL to .txt file (optional if localUrl provided)
  localUrl?: string // Local file path - used in dev mode, or as primary source if no githubUrl
  author?: string
  large?: boolean // Large wishlists (>500 rolls) are not auto-loaded
}

/**
 * Update status for premade wishlists
 */
export interface WishlistUpdateStatus {
  wishlistId: string
  hasUpdate: boolean
  currentVersion?: string // Local stored version
  remoteVersion?: string // Remote version (if checked)
  lastChecked: string // ISO timestamp
}

/**
 * Result of parsing a DIM wishlist file
 */
export interface ParsedWishlist {
  title?: string
  description?: string
  items: WishlistItem[]
}

/**
 * Consolidated view of multiple WishlistItems for the same weapon.
 * Used for display in large preset wishlists where many rolls exist per weapon.
 * This is a view-layer construct - original data is never mutated.
 */
export interface ConsolidatedWishlistItem {
  /** Union of all perk hashes from consolidated items */
  perkHashes: number[]
  /** Concatenated unique notes from all items */
  notes: string | undefined
  /** Union of all unique tags */
  tags: WishlistTag[]
  /** Count of original items consolidated */
  originalCount: number
  /** Count of original notes before deduplication (for "summarized from N" display) */
  originalNotesCount: number
  /** YouTube info from first item with a link (if any) */
  primaryYoutube?: {
    link: string
    author?: string
    timestamp?: string
  }
  /** Count of items with different YouTube links (for "and N more" display) */
  additionalYoutubeCount: number
  /** The original items (kept for reference) */
  sourceItems: WishlistItem[]
}
