export interface Perk {
  hash: number
  name: string
  description: string
  icon: string
  isOwned: boolean
  /** All variant hashes that map to this perk (for grouping purposes) */
  variantHashes?: number[]
  /**
   * If true, this perk cannot be obtained on new drops of the weapon.
   * It was available in past seasons but has been retired from the perk pool.
   */
  cannotCurrentlyRoll?: boolean
}
