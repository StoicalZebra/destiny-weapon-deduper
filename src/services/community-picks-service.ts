/**
 * Service for fetching and caching Community Picks from GitHub
 */

import type { CommunityPick, CommunityPicksData } from '@/models/community-pick'

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/StoicalZebra/destiny-weapon-deduper/main/data/community-picks.json'
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

class CommunityPicksService {
  private cache: CommunityPicksData | null = null
  private cacheTimestamp: number = 0
  private fetchPromise: Promise<CommunityPicksData> | null = null

  /**
   * Fetch community picks data with caching
   */
  async getPicks(): Promise<CommunityPicksData> {
    // Return cached if fresh
    if (this.cache && Date.now() - this.cacheTimestamp < CACHE_DURATION_MS) {
      return this.cache
    }

    // Deduplicate concurrent requests
    if (this.fetchPromise) {
      return this.fetchPromise
    }

    this.fetchPromise = this.fetchFromGitHub()

    try {
      const data = await this.fetchPromise
      this.cache = data
      this.cacheTimestamp = Date.now()
      return data
    } finally {
      this.fetchPromise = null
    }
  }

  /**
   * Get picks filtered by weapon hash
   */
  async getPicksForWeapon(weaponHash: number): Promise<CommunityPick[]> {
    const data = await this.getPicks()
    return data.picks.filter(pick => pick.weaponHash === weaponHash)
  }

  /**
   * Clear cache (useful for admin refresh)
   */
  clearCache(): void {
    this.cache = null
    this.cacheTimestamp = 0
  }

  /**
   * Get last updated timestamp
   */
  getLastUpdated(): string | null {
    return this.cache?.lastUpdated ?? null
  }

  private async fetchFromGitHub(): Promise<CommunityPicksData> {
    try {
      const response = await fetch(GITHUB_RAW_URL, {
        cache: 'no-cache' // Bypass browser cache
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to fetch community picks:', error)
      // Return empty data on error
      return { version: '1.0', lastUpdated: '', picks: [] }
    }
  }
}

export const communityPicksService = new CommunityPicksService()
