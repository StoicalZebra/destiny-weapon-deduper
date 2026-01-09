import type { WeaponInstance } from './weapon-instance'
import type { Perk } from './perk'

export interface DedupedWeapon {
  weaponHash: number
  weaponName: string
  weaponIcon: string
  // Season/version watermark overlay (small badge in upper-left corner)
  iconWatermark?: string

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
}

export interface PerkColumn {
  columnIndex: number
  columnName: string // "Barrel", "Magazine", "Trait 1", "Trait 2", "Origin", "Masterwork"
  availablePerks: Perk[] // All possible perks
  ownedPerks: Set<number> // Perk hashes player owns
}
