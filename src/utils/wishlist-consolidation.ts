/**
 * Wishlist Consolidation Utilities
 *
 * Functions to consolidate multiple wishlist items for the same weapon
 * into a single unified view for large preset wishlists.
 */

import { PRESET_WISHLISTS } from '@/services/preset-wishlist-service'
import { manifestService } from '@/services/manifest-service'
import type { Wishlist, WishlistItem, WishlistTag, ConsolidatedWishlistItem } from '@/models/wishlist'

/**
 * IDs of preset wishlists that should have consolidation applied.
 * Excludes 'stoicalzebra' which uses curated single-roll entries.
 */
const CONSOLIDATION_ENABLED_IDS = new Set(
  PRESET_WISHLISTS.filter((p) => p.id !== 'stoicalzebra').map((p) => p.id)
)

/**
 * Check if a wishlist should have its items consolidated by weapon.
 * Only applies to preset wishlists with large roll counts (excluding StoicalZebra).
 */
export function shouldConsolidateWishlist(wishlist: Wishlist): boolean {
  return wishlist.sourceType === 'preset' && CONSOLIDATION_ENABLED_IDS.has(wishlist.id)
}

/**
 * Consolidate multiple wishlist items for the same weapon into one view.
 *
 * - perkHashes: Union of all unique perk hashes
 * - notes: Concatenate unique notes with " | " separator
 * - tags: Union of all unique tags
 * - YouTube: Use first item's link, count additional unique links
 */
export function consolidateWishlistItems(items: WishlistItem[]): ConsolidatedWishlistItem {
  if (items.length === 0) {
    throw new Error('Cannot consolidate empty item array')
  }

  // Collect unique perk hashes
  const perkHashSet = new Set<number>()
  for (const item of items) {
    for (const hash of item.perkHashes) {
      perkHashSet.add(hash)
    }
  }

  // Collect unique notes with MW extraction
  // Dedupe on core content (after stripping MWs), then summarize all unique MWs
  const uniqueNotes = new Map<string, { coreNote: string; mws: Set<string> }>()
  let originalNotesCount = 0
  for (const item of items) {
    if (item.notes?.trim()) {
      originalNotesCount++
      const original = item.notes.trim()
      const parsed = parseNoteContent(original)
      const normalizedKey = normalizeNoteForDeduplication(parsed.coreNote)

      if (normalizedKey) {
        if (!uniqueNotes.has(normalizedKey)) {
          uniqueNotes.set(normalizedKey, { coreNote: parsed.coreNote, mws: new Set() })
        }
        // Add any MWs found in this note to the collection
        for (const mw of parsed.masterworks) {
          uniqueNotes.get(normalizedKey)!.mws.add(mw)
        }
      }
    }
  }

  // Collect unique tags
  const tagSet = new Set<WishlistTag>()
  for (const item of items) {
    if (item.tags) {
      for (const tag of item.tags) {
        tagSet.add(tag)
      }
    }
  }

  // Collect unique YouTube links (by link URL to dedupe)
  const youtubeMap = new Map<string, { link: string; author?: string; timestamp?: string }>()
  for (const item of items) {
    if (item.youtubeLink && !youtubeMap.has(item.youtubeLink)) {
      youtubeMap.set(item.youtubeLink, {
        link: item.youtubeLink,
        author: item.youtubeAuthor,
        timestamp: item.youtubeTimestamp
      })
    }
  }

  const youtubeEntries = Array.from(youtubeMap.values())

  // Build final notes with MW summaries
  const finalNotes = Array.from(uniqueNotes.values()).map(({ coreNote, mws }) => {
    if (mws.size > 0) {
      const mwList = Array.from(mws).sort().join(', ')
      return `${coreNote} [MW: ${mwList}]`
    }
    return coreNote
  })

  return {
    perkHashes: Array.from(perkHashSet),
    notes: finalNotes.length > 0 ? finalNotes.join(' | ') : undefined,
    tags: Array.from(tagSet),
    originalCount: items.length,
    originalNotesCount,
    primaryYoutube: youtubeEntries[0],
    additionalYoutubeCount: Math.max(0, youtubeEntries.length - 1),
    sourceItems: items
  }
}

/**
 * Group wishlist items by weapon name for UI consolidation.
 *
 * This groups ALL weapons with the same name together, regardless of season or variant.
 * Used for consolidated wishlist views where we want to merge all entries for "Permafrost"
 * even if they span normal/holofoil or different seasonal re-releases.
 *
 * NOTE: This is different from `manifestService.getWeaponVariantHashes()` which groups
 * by name + season/watermark and won't catch event variants (e.g., Dawning holofoils).
 * Use this function when you want ALL versions of a weapon name grouped together.
 *
 * @returns Map<representativeHash, items[]> where the key is the first hash encountered
 * for each weapon name (used as a stable key, not for variant lookups).
 */
export function groupItemsByWeaponName(items: WishlistItem[]): Map<number, WishlistItem[]> {
  // First pass: group by weapon name
  const nameToItems = new Map<string, WishlistItem[]>()
  const nameToRepresentativeHash = new Map<string, number>()

  for (const item of items) {
    const def = manifestService.getInventoryItem(item.weaponHash)
    const name = def?.displayProperties?.name || `Unknown_${item.weaponHash}`

    if (!nameToItems.has(name)) {
      nameToItems.set(name, [])
      nameToRepresentativeHash.set(name, item.weaponHash) // First hash becomes the map key
    }
    nameToItems.get(name)!.push(item)
  }

  // Second pass: convert to hash-keyed map
  const groups = new Map<number, WishlistItem[]>()
  for (const [name, groupItems] of nameToItems) {
    const representativeHash = nameToRepresentativeHash.get(name)!
    groups.set(representativeHash, groupItems)
  }

  return groups
}

/**
 * Deduplicate wishlist items that have identical roll definitions.
 *
 * When a wishlist contains entries for multiple variant hashes of the same weapon
 * (e.g., normal + holofoil), the same roll may be defined for each hash.
 * This function removes duplicate rolls, keeping only one instance.
 *
 * Two items are considered duplicates if they have:
 * - Same perk hashes (sorted for comparison)
 * - Same notes content
 *
 * @returns Array of deduplicated items, preserving the first occurrence of each unique roll
 */
export function deduplicateWishlistItems(items: WishlistItem[]): WishlistItem[] {
  const seen = new Set<string>()
  const result: WishlistItem[] = []

  for (const item of items) {
    // Create a unique key from sorted perk hashes + notes
    const perkKey = [...item.perkHashes].sort((a, b) => a - b).join(',')
    const notesKey = item.notes?.trim() || ''
    const uniqueKey = `${perkKey}|${notesKey}`

    if (!seen.has(uniqueKey)) {
      seen.add(uniqueKey)
      result.push(item)
    }
  }

  return result
}

/**
 * Parse note content to extract the core review and masterwork recommendations.
 *
 * Example input:
 * "SpaceMonkey (PvE): \"Great weapon\" Recommended MW: Charge Time, Reload.|tags:pve"
 *
 * Returns:
 * - coreNote: "SpaceMonkey (PvE): \"Great weapon\""
 * - masterworks: ["Charge Time", "Reload"]
 */
function parseNoteContent(note: string): { coreNote: string; masterworks: string[] } {
  // Remove |tags:... suffix first
  let content = note.replace(/\|tags:[^\|]*$/i, '').trim()

  // Extract "Recommended MW:" section
  // Pattern matches: "Recommended MW: Charge Time, Reload, Handling." or "Recommended MW: Charge Time."
  const mwMatch = content.match(/\s*Recommended MW:\s*([^|]+?)\.?\s*$/i)
  const masterworks: string[] = []

  if (mwMatch) {
    // Remove MW section from content
    content = content.replace(/\s*Recommended MW:\s*[^|]+?\.?\s*$/i, '').trim()
    // Parse MW list (comma-separated)
    const mwList = mwMatch[1].split(',').map((mw) => mw.trim()).filter(Boolean)
    masterworks.push(...mwList)
  }

  return { coreNote: content, masterworks }
}

/**
 * Normalize a note string for deduplication comparison.
 *
 * Handles common patterns that create near-duplicates:
 * 1. Normalizes author tag variations (e.g., "Author (PvE / God-PvE):" → "Author:")
 *
 * Note: Tags and MW recommendations are already stripped by parseNoteContent().
 *
 * This ensures notes like:
 * - "SpaceMonkey (PvE / God-PvE): Great roll" and "SpaceMonkey (PvE): Great roll"
 * are treated as duplicates, keeping only the first one encountered.
 */
function normalizeNoteForDeduplication(note: string): string {
  // Normalize author prefix by removing parenthetical tags
  // Pattern: "AuthorName (tag1 / tag2 / ...):" → "AuthorName:"
  // This handles formats like "SpaceMonkey (PvE / God-PvE):" or "Author (PvP):"
  const normalized = note.replace(/^([^:(]+?)\s*\([^)]*\)\s*:/, '$1:')

  return normalized.trim()
}
