export interface Perk {
  hash: number
  name: string
  description: string
  icon: string
  isOwned: boolean
  /** All variant hashes (e.g., enhanced + non-enhanced) that map to this perk */
  variantHashes?: number[]
}
