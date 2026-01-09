/**
 * Community Picks - Curated god roll recommendations from streamers
 */

export type SelectionType = 'OR' | 'AND'

export interface CommunityPick {
  id: string
  name: string                              // e.g., "Aztecross PvP Roll"
  weaponHash: number
  category: 'PVE' | 'PVP' | 'ALL'
  streamer: {
    name: string                            // e.g., "Aztecross"
  }
  sourceUrl?: string                        // Optional YouTube/article link
  selection: Record<number, SelectionType>  // Perk hash -> requirement type
  notes?: string
  createdAt?: string                        // ISO date
  updatedAt?: string                        // ISO date
}

export interface CommunityPicksData {
  version: string
  lastUpdated: string
  picks: CommunityPick[]
}
