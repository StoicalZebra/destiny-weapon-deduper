/**
 * Formatting utilities for display strings
 */

/**
 * Format masterwork stat name by removing tier/prefix labels
 * "Tier 3: Stability" → "Stability"
 * "Masterworked: Range" → "Range"
 * "Enhanced Handling" → "Handling"
 */
export function formatMasterworkStatName(name: string): string {
  return name
    .replace(/^Tier\s+\d+:\s*/i, '')
    .replace(/^Masterworked:\s*/i, '')
    .replace(/^Enhanced\s+/i, '')
}

/**
 * Format hash as suffix for display (last N digits)
 * 1234567890 → "7890"
 */
export function formatHashSuffix(hash: number | string, digits = 4): string {
  return String(hash).slice(-digits)
}
