/**
 * DIM Wishlist Format Parser
 *
 * Parses and serializes DIM-compatible wishlist .txt format
 * See: https://github.com/DestinyItemManager/DIM/wiki/Creating-Wish-Lists
 *
 * Format examples:
 *   title:My Wishlist
 *   description:Curated god rolls for PvP
 *   //notes:These are great for Trials
 *   dimwishlist:item=1429497048&perks=3661387068,1015611457#notes:PvP Roll|tags:pvp,godroll
 */

import type { WishlistItem, WishlistTag, ParsedWishlist } from '@/models/wishlist'

// Regex patterns for parsing DIM format
const TITLE_PATTERN = /^title:(.+)$/i
const DESCRIPTION_PATTERN = /^description:(.+)$/i
const BLOCK_NOTES_PATTERN = /^\/\/notes:(.+)$/i
const COMMENT_PATTERN = /^\/\//
const DIMWISHLIST_PATTERN =
  /^dimwishlist:item=(-?\d+)(?:&perks=([0-9,|]+))?(?:#notes:([^|]+))?(?:\|tags:(.+))?$/i

// Valid DIM tags
const VALID_TAGS: WishlistTag[] = ['godroll', 'pvp', 'pve', 'mkb', 'controller', 'trash']

// Special item IDs
export const WILDCARD_ITEM_ID = -69420

/**
 * Parse a tags string into an array of valid WishlistTags
 */
function parseTags(tagsString: string): WishlistTag[] {
  if (!tagsString) return []

  return tagsString
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t): t is WishlistTag => VALID_TAGS.includes(t as WishlistTag))
}

/**
 * Parse a perks string into an array of numbers
 * DIM format uses commas to separate perks and pipes (|) for alternatives in the same column
 * Both are flattened into a single array of perk hashes
 */
function parsePerks(perksString: string): number[] {
  if (!perksString) return []

  // Split on both commas and pipes (DIM uses | for "OR" alternatives)
  return perksString
    .split(/[,|]/)
    .map((p) => parseInt(p.trim(), 10))
    .filter((p) => !isNaN(p))
}

/**
 * Parse DIM wishlist content into structured data
 */
export function parseDimWishlist(content: string): ParsedWishlist {
  const lines = content.split(/\r?\n/)

  let title: string | undefined
  let description: string | undefined
  let currentBlockNotes: string | undefined
  const items: WishlistItem[] = []

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Skip empty lines
    if (!trimmedLine) {
      continue
    }

    // Check for title (only use first occurrence)
    const titleMatch = trimmedLine.match(TITLE_PATTERN)
    if (titleMatch && !title) {
      title = titleMatch[1].trim()
      continue
    }

    // Check for description (only use first occurrence)
    const descMatch = trimmedLine.match(DESCRIPTION_PATTERN)
    if (descMatch && !description) {
      description = descMatch[1].trim()
      continue
    }

    // Check for block notes (applies to following items)
    const blockNotesMatch = trimmedLine.match(BLOCK_NOTES_PATTERN)
    if (blockNotesMatch) {
      currentBlockNotes = blockNotesMatch[1].trim()
      continue
    }

    // Skip regular comments
    if (COMMENT_PATTERN.test(trimmedLine)) {
      continue
    }

    // Parse dimwishlist line
    const wishlistMatch = trimmedLine.match(DIMWISHLIST_PATTERN)
    if (wishlistMatch) {
      const [, itemHashStr, perksStr, notesStr, tagsStr] = wishlistMatch
      const weaponHash = parseInt(itemHashStr, 10)

      // Determine if this is a trash list item (negative hash)
      const isTrashList = weaponHash < 0
      const actualWeaponHash = isTrashList ? Math.abs(weaponHash) : weaponHash

      // Use item notes if present, otherwise use block notes
      let notes = notesStr?.trim() || currentBlockNotes

      // Parse tags
      let tags = parseTags(tagsStr || '')

      // If trash list, ensure 'trash' tag is present
      if (isTrashList && !tags.includes('trash')) {
        tags = ['trash', ...tags]
      }

      const item: WishlistItem = {
        id: crypto.randomUUID(),
        weaponHash: actualWeaponHash,
        perkHashes: parsePerks(perksStr || ''),
        notes,
        tags: tags.length > 0 ? tags : undefined
      }

      items.push(item)
      continue
    }

    // Non-recognized line clears block notes (per DIM spec)
    // Only clear if it's not whitespace (already handled above)
    if (trimmedLine && !COMMENT_PATTERN.test(trimmedLine)) {
      currentBlockNotes = undefined
    }
  }

  return { title, description, items }
}

/**
 * Serialize a wishlist to DIM format string
 */
export function serializeToDimFormat(
  items: WishlistItem[],
  options?: {
    title?: string
    description?: string
  }
): string {
  const lines: string[] = []

  // Add title and description
  if (options?.title) {
    lines.push(`title:${options.title}`)
  }
  if (options?.description) {
    lines.push(`description:${options.description}`)
  }

  // Add blank line after metadata if we have any
  if (lines.length > 0) {
    lines.push('')
  }

  // Group items by weapon for better organization
  const itemsByWeapon = new Map<number, WishlistItem[]>()
  for (const item of items) {
    const existing = itemsByWeapon.get(item.weaponHash) || []
    existing.push(item)
    itemsByWeapon.set(item.weaponHash, existing)
  }

  // Serialize each weapon's items
  for (const [weaponHash, weaponItems] of itemsByWeapon) {
    for (const item of weaponItems) {
      lines.push(serializeItem(item, weaponHash))
    }
  }

  return lines.join('\n')
}

/**
 * Serialize a single wishlist item to a dimwishlist line
 */
function serializeItem(item: WishlistItem, weaponHash?: number): string {
  const hash = weaponHash ?? item.weaponHash

  // Check if this is a trash list item
  const isTrash = item.tags?.includes('trash')
  const itemHash = isTrash ? -hash : hash

  let line = `dimwishlist:item=${itemHash}`

  // Add perks if present
  if (item.perkHashes.length > 0) {
    line += `&perks=${item.perkHashes.join(',')}`
  }

  // Add notes if present
  if (item.notes) {
    line += `#notes:${item.notes}`
  }

  // Add tags if present (excluding 'trash' since that's encoded in negative hash)
  const tagsToInclude = item.tags?.filter((t) => t !== 'trash') || []
  if (tagsToInclude.length > 0) {
    line += `|tags:${tagsToInclude.join(',')}`
  }

  return line
}

/**
 * Validate that a string appears to be DIM wishlist format
 */
export function isDimWishlistFormat(content: string): boolean {
  // Must contain at least one dimwishlist line
  // Use multiline check since the regex is anchored
  const lines = content.split(/\r?\n/)
  return lines.some((line) => DIMWISHLIST_PATTERN.test(line.trim()))
}

/**
 * Get stats about a parsed wishlist
 */
export function getWishlistStats(items: WishlistItem[]): {
  itemCount: number
  weaponCount: number
} {
  const weaponHashes = new Set(items.map((item) => item.weaponHash))
  return {
    itemCount: items.length,
    weaponCount: weaponHashes.size
  }
}

/**
 * Filter wishlist items for a specific weapon
 */
export function getItemsForWeapon(items: WishlistItem[], weaponHash: number): WishlistItem[] {
  return items.filter(
    (item) => item.weaponHash === weaponHash || item.weaponHash === WILDCARD_ITEM_ID
  )
}

/**
 * Compute a simple hash of the wishlist content for version tracking
 * Uses a fast non-cryptographic hash for change detection
 */
export async function computeContentHash(content: string): Promise<string> {
  // Use SubtleCrypto for SHA-256 hash
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
