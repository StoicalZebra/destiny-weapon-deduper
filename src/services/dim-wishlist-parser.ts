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

// ==================== God Roll Creator Integration ====================

/**
 * Selection type for God Roll Creator UI
 * AND = required perk (must have)
 * OR = optional/alternative perk (nice to have)
 */
export type GodRollSelectionType = 'AND' | 'OR'

/**
 * God Roll Creator selection state
 * Maps perk hash to selection type
 */
export type GodRollSelection = Record<number, GodRollSelectionType>

/**
 * Perk column info for grouping perks by column
 */
export interface PerkColumnInfo {
  columnIndex: number
  columnName: string
  availablePerks: Array<{ hash: number; name: string }>
}

/**
 * Convert God Roll Creator selection to a WishlistItem
 *
 * Logic:
 * - AND perks are always included in perkHashes
 * - OR perks in the same column are pipe-separated in DIM format
 * - The resulting perkHashes array contains all perk combos
 *
 * @param selection - The AND/OR selection map from God Roll Creator
 * @param weaponHash - The weapon's hash
 * @param perkColumns - Column info to group perks by column
 * @param options - Optional notes and tags
 */
export function selectionToWishlistItem(
  selection: GodRollSelection,
  weaponHash: number,
  perkColumns: PerkColumnInfo[],
  options?: {
    notes?: string
    tags?: WishlistTag[]
    existingId?: string
  }
): WishlistItem {
  // Group selected perks by column
  const perksByColumn = new Map<number, { andPerks: number[]; orPerks: number[] }>()

  for (const col of perkColumns) {
    const andPerks: number[] = []
    const orPerks: number[] = []

    for (const perk of col.availablePerks) {
      const selType = selection[perk.hash]
      if (selType === 'AND') {
        andPerks.push(perk.hash)
      } else if (selType === 'OR') {
        orPerks.push(perk.hash)
      }
    }

    if (andPerks.length > 0 || orPerks.length > 0) {
      perksByColumn.set(col.columnIndex, { andPerks, orPerks })
    }
  }

  // Build perkHashes array
  // DIM format: perks separated by comma, alternatives in same "slot" by pipe
  // For our purposes, we flatten AND perks + OR perks per column
  const perkHashes: number[] = []

  for (const [, { andPerks, orPerks }] of perksByColumn) {
    // AND perks are required - add them all
    perkHashes.push(...andPerks)
    // OR perks are alternatives - also add them (DIM will match if ANY perk in list matches)
    perkHashes.push(...orPerks)
  }

  return {
    id: options?.existingId || crypto.randomUUID(),
    weaponHash,
    perkHashes,
    notes: options?.notes,
    tags: options?.tags
  }
}

/**
 * Serialize a God Roll selection to DIM format string with pipe-separated OR perks
 *
 * This creates a properly formatted DIM wishlist line where:
 * - AND perks are comma-separated
 * - OR perks in the same column are pipe-separated
 *
 * Example: dimwishlist:item=877384&perks=123,456|789,1011
 * (123 required, 456 OR 789 alternatives in one column, 1011 required)
 */
export function selectionToDimLine(
  selection: GodRollSelection,
  weaponHash: number,
  perkColumns: PerkColumnInfo[],
  options?: {
    notes?: string
    tags?: WishlistTag[]
  }
): string {
  // Group selected perks by column, maintaining column order
  const columnPerkStrings: string[] = []

  for (const col of perkColumns) {
    const andPerks: number[] = []
    const orPerks: number[] = []

    for (const perk of col.availablePerks) {
      const selType = selection[perk.hash]
      if (selType === 'AND') {
        andPerks.push(perk.hash)
      } else if (selType === 'OR') {
        orPerks.push(perk.hash)
      }
    }

    // Skip columns with no selections
    if (andPerks.length === 0 && orPerks.length === 0) continue

    // Build column string: AND perks comma-separated, OR perks pipe-separated
    // If we have both AND and OR in same column, AND perks take precedence
    // Actually for DIM: we want "any of these" so pipe-separate OR perks
    if (andPerks.length > 0 && orPerks.length > 0) {
      // Mix: AND perks first, then OR alternatives
      // Format: and1,and2|or1|or2 means "need and1 AND and2, plus one of or1/or2"
      // But DIM doesn't support this complex logic per-column
      // Simplify: all selected perks are pipe-separated (any match)
      columnPerkStrings.push([...andPerks, ...orPerks].join('|'))
    } else if (andPerks.length > 0) {
      // Only AND perks - all required, but DIM matches any
      // For strict AND across columns, we comma-separate between columns
      columnPerkStrings.push(andPerks.join('|'))
    } else if (orPerks.length > 0) {
      // Only OR perks - pipe-separate for alternatives
      columnPerkStrings.push(orPerks.join('|'))
    }
  }

  // Build DIM line
  let line = `dimwishlist:item=${weaponHash}`

  if (columnPerkStrings.length > 0) {
    // Columns separated by comma (cross-column), perks within column by pipe
    line += `&perks=${columnPerkStrings.join(',')}`
  }

  if (options?.notes) {
    line += `#notes:${options.notes}`
  }

  const tagsToInclude = options?.tags?.filter((t) => t !== 'trash') || []
  if (tagsToInclude.length > 0) {
    line += `|tags:${tagsToInclude.join(',')}`
  }

  return line
}

/**
 * Convert a WishlistItem back to God Roll Creator selection format
 *
 * Since DIM format loses AND vs OR distinction, we treat all perks as AND (required)
 * The user can adjust in the Creator UI if needed
 *
 * @param item - The wishlist item to convert
 * @param perkColumns - Column info to validate perks belong to this weapon
 */
export function wishlistItemToSelection(
  item: WishlistItem,
  perkColumns: PerkColumnInfo[]
): GodRollSelection {
  const selection: GodRollSelection = {}

  // Build a set of valid perk hashes for this weapon
  const validPerkHashes = new Set<number>()
  for (const col of perkColumns) {
    for (const perk of col.availablePerks) {
      validPerkHashes.add(perk.hash)
    }
  }

  // Add all perk hashes from the wishlist item as AND selections
  // (since DIM format doesn't preserve AND vs OR distinction)
  for (const hash of item.perkHashes) {
    if (validPerkHashes.has(hash)) {
      selection[hash] = 'AND'
    }
  }

  return selection
}

/**
 * Check if a weapon instance matches a wishlist item
 *
 * @param instancePerkHashes - All perk hashes on the instance (active + reusable)
 * @param wishlistPerkHashes - Required perk hashes from wishlist item
 * @returns true if instance has ALL the required perks
 */
export function doesInstanceMatchWishlistItem(
  instancePerkHashes: Set<number>,
  wishlistPerkHashes: number[]
): boolean {
  // Instance matches if it has ALL the wishlist perks
  return wishlistPerkHashes.every((hash) => instancePerkHashes.has(hash))
}

/**
 * Get all wishlist-recommended perk hashes for a weapon
 * Returns a map of perkHash -> wishlist names that recommend it
 *
 * @param wishlistResults - Results from store.getItemsForWeaponHash()
 */
export function getWishlistPerkAnnotations(
  wishlistResults: Array<{ wishlist: { name: string }; items: WishlistItem[] }>
): Map<number, string[]> {
  const annotations = new Map<number, string[]>()

  for (const { wishlist, items } of wishlistResults) {
    for (const item of items) {
      for (const perkHash of item.perkHashes) {
        const existing = annotations.get(perkHash) || []
        if (!existing.includes(wishlist.name)) {
          existing.push(wishlist.name)
        }
        annotations.set(perkHash, existing)
      }
    }
  }

  return annotations
}
