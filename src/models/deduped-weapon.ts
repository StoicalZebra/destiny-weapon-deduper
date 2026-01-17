import type { WeaponInstance } from './weapon-instance'
import type { Perk } from './perk'

/**
 * Tracks variant information for weapons with multiple hashes (e.g., normal + holofoil)
 */
export interface WeaponVariantInfo {
  hash: number
  isHolofoil: boolean
}

export interface DedupedWeapon {
  weaponHash: number // Primary hash (prefers non-holofoil)
  weaponName: string
  weaponType: string // e.g., "Hand Cannon", "Auto Rifle"
  weaponIcon: string
  // Season/version watermark overlay (small badge in upper-left corner)
  iconWatermark?: string
  // Season display name (e.g., "Season 28")
  seasonName?: string

  // Variant tracking (for holofoil + normal grouping)
  variantHashes: WeaponVariantInfo[]
  hasHolofoil: boolean // Convenience flag for UI

  // Merged perk data
  perkMatrix: PerkColumn[]
  intrinsicPerks: Perk[]
  masterworkPerks: Perk[]

  // Contributing instances
  instances: WeaponInstance[]

  // Metadata
  totalPerksOwned: number
  totalPerksPossible: number
  completionPercentage: number

  // Rarity (6 = Exotic, 5 = Legendary)
  tierType: number

  // Gear tier range across all instances (1-5 stars)
  // null means all instances are pre-9.0.0 (no tier data)
  minGearTier: number | null
  maxGearTier: number | null

  // Socket index for the masterwork slot (used to look up per-instance masterwork)
  masterworkSocketIndex?: number
}

export interface PerkColumn {
  columnIndex: number
  columnName: string // "Barrel", "Magazine", "Trait 1", "Trait 2", "Origin", "Masterwork"
  availablePerks: Perk[] // All possible perks
  ownedPerks: Set<number> // Perk hashes player owns
}
