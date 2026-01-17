/**
 * Parse a light.gg weapon URL to extract the weapon hash
 *
 * Supports formats:
 * - https://www.light.gg/db/items/2873508409/high-tyrant/
 * - https://light.gg/db/items/2873508409
 * - light.gg/db/items/2873508409/high-tyrant (no protocol)
 * - www.light.gg/db/items/2873508409
 *
 * @param url - The light.gg URL to parse
 * @returns The weapon hash as a number, or null if invalid
 */
export function parseLightGgUrl(url: string): number | null {
  // Normalize URL: trim whitespace
  let normalized = url.trim()

  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }

  try {
    const parsed = new URL(normalized)

    // Check if it's a light.gg domain
    if (!parsed.hostname.includes('light.gg')) {
      return null
    }

    // Match path pattern: /db/items/{hash}/ or /db/items/{hash}/{slug}/
    const match = parsed.pathname.match(/\/db\/items\/(\d+)/)
    if (!match) return null

    const hash = parseInt(match[1], 10)
    return Number.isFinite(hash) ? hash : null
  } catch {
    return null
  }
}
