export interface Perk {
  hash: number
  name: string
  description: string
  icon: string
  isOwned: boolean
  /** All variant hashes (e.g., enhanced + non-enhanced) that map to this perk */
  variantHashes?: number[]
  /**
   * If true, this perk cannot be obtained on new drops of the weapon.
   * It was available in past seasons but has been retired from the perk pool.
   */
  cannotCurrentlyRoll?: boolean
  /** True if this perk is the enhanced variant */
  isEnhanced?: boolean
  /** The base (non-enhanced) perk hash, if this has variants */
  baseHash?: number
  /** The enhanced perk hash, if an enhanced variant exists */
  enhancedHash?: number
  /** True if this perk has an enhanced variant available */
  hasEnhancedVariant?: boolean
  /** Enhanced variant's description (if different from base) */
  enhancedDescription?: string
  /** Enhanced variant's icon path (if different from base) */
  enhancedIcon?: string
}
