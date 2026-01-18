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

// Valid tags (matches WishlistTag type in models/wishlist.ts)
const VALID_TAGS: WishlistTag[] = ['pvp', 'pve', 'mkb', 'controller', 'alt', 'trash']

// Special item IDs
export const WILDCARD_ITEM_ID = -69420

// Pattern to extract YouTube info from notes: [YT: Author URL @timestamp]
// Examples:
//   [YT: IFrostBolt https://youtu.be/abc @1:23]
//   [YT: Maven https://www.youtube.com/watch?v=xyz @4:09]
//   [YT: https://www.blueberries.gg/weapons/xyz/]
const YOUTUBE_INFO_PATTERN = /\[YT:\s*([^\]]+)\]/i

/**
 * Parse YouTube info from notes string
 * Returns extracted author, link, and timestamp (if present)
 */
function parseYoutubeInfo(notes: string | undefined): {
  youtubeAuthor?: string
  youtubeLink?: string
  youtubeTimestamp?: string
} {
  if (!notes) return {}

  const match = notes.match(YOUTUBE_INFO_PATTERN)
  if (!match) return {}

  const content = match[1].trim()

  // Try to extract URL (http/https)
  const urlMatch = content.match(/(https?:\/\/[^\s@]+)/)
  const youtubeLink = urlMatch?.[1]

  // Try to extract timestamp (@1:23 or @10:52)
  const timestampMatch = content.match(/@(\d+:\d+)/)
  const youtubeTimestamp = timestampMatch?.[1]

  // Extract author: everything before the URL (if URL exists) or the whole content
  let youtubeAuthor: string | undefined
  if (urlMatch) {
    const beforeUrl = content.substring(0, urlMatch.index).trim()
    if (beforeUrl) {
      youtubeAuthor = beforeUrl
    }
  } else {
    // No URL, just use the content as author if it doesn't look like a timestamp
    if (!content.startsWith('@')) {
      youtubeAuthor = content
    }
  }

  return { youtubeAuthor, youtubeLink, youtubeTimestamp }
}

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

      // Extract YouTube info from notes
      const { youtubeAuthor, youtubeLink, youtubeTimestamp } = parseYoutubeInfo(notes)

      const item: WishlistItem = {
        id: crypto.randomUUID(),
        weaponHash: actualWeaponHash,
        perkHashes: parsePerks(perksStr || ''),
        notes,
        tags: tags.length > 0 ? tags : undefined,
        youtubeAuthor,
        youtubeLink,
        youtubeTimestamp
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
 *
 * @param items - Wishlist items to serialize
 * @param options - Optional title, description, and variant hash lookup
 * @param options.getVariantHashes - Function to get all variant hashes for a weapon (for multi-hash export)
 * @param options.getWeaponName - Function to get weapon name for comments (e.g., "Riptide")
 * @param options.getWeaponType - Function to get weapon type for comments (e.g., "Fusion Rifle")
 */
export function serializeToDimFormat(
  items: WishlistItem[],
  options?: {
    title?: string
    description?: string
    /** Optional function to get all variant hashes for a weapon hash (e.g., holofoil + normal) */
    getVariantHashes?: (hash: number) => number[]
    /** Optional function to get weapon name for comments */
    getWeaponName?: (hash: number) => string | undefined
    /** Optional function to get weapon type for comments */
    getWeaponType?: (hash: number) => string | undefined
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
  // Use a "canonical" hash (first variant) as the group key to merge variants
  const itemsByWeaponGroup = new Map<number, WishlistItem[]>()
  const canonicalHashMap = new Map<number, number>() // maps any hash -> canonical (first) hash

  for (const item of items) {
    let groupKey = item.weaponHash

    // If we have variant lookup, use the first variant hash as the canonical key
    if (options?.getVariantHashes) {
      const variants = options.getVariantHashes(item.weaponHash)
      if (variants.length > 0) {
        // Use cached canonical hash or compute it
        if (!canonicalHashMap.has(item.weaponHash)) {
          const canonical = Math.min(...variants) // Use smallest hash as canonical
          for (const v of variants) {
            canonicalHashMap.set(v, canonical)
          }
        }
        groupKey = canonicalHashMap.get(item.weaponHash) ?? item.weaponHash
      }
    }

    const existing = itemsByWeaponGroup.get(groupKey) || []
    existing.push(item)
    itemsByWeaponGroup.set(groupKey, existing)
  }

  // Sort weapon groups alphabetically by name
  const sortedWeaponGroups = Array.from(itemsByWeaponGroup.entries()).sort((a, b) => {
    const nameA = options?.getWeaponName?.(a[0])?.toLowerCase() ?? ''
    const nameB = options?.getWeaponName?.(b[0])?.toLowerCase() ?? ''
    return nameA.localeCompare(nameB)
  })

  // Serialize each weapon's items with blank lines between weapon groups
  let isFirstWeapon = true
  for (const [groupKey, weaponItems] of sortedWeaponGroups) {
    // Add blank line before each weapon group (except the first)
    if (!isFirstWeapon) {
      lines.push('')
    }
    isFirstWeapon = false

    // Add weapon name comment if available
    if (options?.getWeaponName) {
      const weaponName = options.getWeaponName(groupKey)
      if (weaponName) {
        const weaponType = options?.getWeaponType?.(groupKey)
        const header = weaponType
          ? `// ===== ${weaponName.toUpperCase()} (${weaponType}) =====`
          : `// ===== ${weaponName.toUpperCase()} =====`
        lines.push(header)
      }
    }

    // Group items by contributor (youtubeAuthor) within each weapon
    const itemsByContributor = new Map<string, WishlistItem[]>()
    for (const item of weaponItems) {
      const contributor = item.youtubeAuthor || 'Unknown'
      const existing = itemsByContributor.get(contributor) || []
      existing.push(item)
      itemsByContributor.set(contributor, existing)
    }

    // Output items grouped by contributor
    for (const [contributor, contributorItems] of itemsByContributor) {
      // Add contributor comment if we have weapon name comments enabled
      if (options?.getWeaponName) {
        lines.push(`// ${contributor}`)
      }

      // Deduplicate items by roll signature (perks + notes + tags)
      // This prevents duplicate lines when the same roll exists for multiple variant hashes
      const uniqueRolls = new Map<string, WishlistItem>()
      for (const item of contributorItems) {
        const signature = `${item.perkHashes.join(',')}-${item.notes || ''}-${item.tags?.join(',') || ''}`
        if (!uniqueRolls.has(signature)) {
          uniqueRolls.set(signature, item)
        }
      }

      // Sort unique rolls for consistent output
      const sortedItems = Array.from(uniqueRolls.values()).sort((a, b) => {
        const sigA = `${a.perkHashes.join(',')}-${a.notes || ''}-${a.tags?.join(',') || ''}`
        const sigB = `${b.perkHashes.join(',')}-${b.notes || ''}-${b.tags?.join(',') || ''}`
        return sigA.localeCompare(sigB)
      })

      for (const item of sortedItems) {
        // Get all variant hashes for this weapon (or just the original hash)
        const variantHashes = options?.getVariantHashes
          ? options.getVariantHashes(item.weaponHash)
          : [item.weaponHash]

        // Output one line per variant hash (for multi-hash weapons like holofoil + normal)
        for (const hash of variantHashes) {
          lines.push(serializeItem(item, hash))
        }
      }
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

  // Build notes with YouTube data embedded
  let fullNotes = item.notes || ''

  // Only append YouTube info if notes don't already contain a [YT:] tag
  // This prevents duplicate tags when re-exporting imported wishlists
  const notesAlreadyHaveYT = YOUTUBE_INFO_PATTERN.test(fullNotes)

  if (!notesAlreadyHaveYT) {
    // Append YouTube info if present: [YT: Author link @timestamp]
    const ytParts: string[] = []
    if (item.youtubeAuthor) ytParts.push(item.youtubeAuthor)
    if (item.youtubeLink) ytParts.push(item.youtubeLink)
    if (item.youtubeTimestamp) ytParts.push(`@${item.youtubeTimestamp}`)

    if (ytParts.length > 0) {
      const ytInfo = `[YT: ${ytParts.join(' ')}]`
      fullNotes = fullNotes ? `${fullNotes} ${ytInfo}` : ytInfo
    }
  }

  // Add notes if present (now includes embedded YouTube data)
  if (fullNotes) {
    line += `#notes:${fullNotes}`
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
 * God Roll Creator selection state
 * Set of selected perk hashes
 */
export type GodRollSelection = Set<number>

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
 * @param selection - Set of selected perk hashes
 * @param weaponHash - The weapon's hash
 * @param perkColumns - Column info (used to filter to valid perks only)
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
    youtubeLink?: string
    youtubeAuthor?: string
    youtubeTimestamp?: string
    createdBy?: string
  }
): WishlistItem {
  // Build set of valid perk hashes for this weapon
  const validPerkHashes = new Set<number>()
  for (const col of perkColumns) {
    for (const perk of col.availablePerks) {
      validPerkHashes.add(perk.hash)
    }
  }

  // Filter selection to only valid perks
  const perkHashes = [...selection].filter((hash) => validPerkHashes.has(hash))

  return {
    id: options?.existingId || crypto.randomUUID(),
    weaponHash,
    perkHashes,
    notes: options?.notes,
    tags: options?.tags,
    youtubeLink: options?.youtubeLink,
    youtubeAuthor: options?.youtubeAuthor,
    youtubeTimestamp: options?.youtubeTimestamp,
    createdBy: options?.createdBy,
    updatedAt: new Date().toISOString()
  }
}

/**
 * Convert a WishlistItem back to God Roll Creator selection format
 *
 * @param item - The wishlist item to convert
 * @param perkColumns - Column info to validate perks belong to this weapon
 */
export function wishlistItemToSelection(
  item: WishlistItem,
  perkColumns: PerkColumnInfo[]
): GodRollSelection {
  // Build a set of valid perk hashes for this weapon
  const validPerkHashes = new Set<number>()
  for (const col of perkColumns) {
    for (const perk of col.availablePerks) {
      validPerkHashes.add(perk.hash)
    }
  }

  // Return set of valid perk hashes from the wishlist item
  return new Set(item.perkHashes.filter((hash) => validPerkHashes.has(hash)))
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
