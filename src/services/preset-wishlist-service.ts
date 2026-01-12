/**
 * Preset Wishlist Service
 *
 * Manages fetching and caching of preset wishlists from GitHub
 * Includes update detection via content hashing
 */

import type { Wishlist, PresetWishlistConfig, WishlistUpdateStatus } from '@/models/wishlist'
import { parseDimWishlist, computeContentHash, getWishlistStats } from './dim-wishlist-parser'
import { wishlistStorageService } from './wishlist-storage-service'

/**
 * Configured preset wishlists
 * These are popular community wishlists that users can subscribe to
 */
export const PRESET_WISHLISTS: PresetWishlistConfig[] = [
  {
    id: 'stoicalzebra',
    name: 'StoicalZebra',
    description:
      'Personal god rolls curated from YouTube reviews. Compiled from Legoleflash, IFrostBolt, Maven, and other community creators.',
    githubUrl:
      'https://raw.githubusercontent.com/StoicalZebra/destiny-weapon-deduper/main/data/wishlists/StoicalZebra-wishlist.txt',
    author: 'StoicalZebra',
    isAdminCurated: true
  },
  {
    id: 'voltron',
    name: 'Voltron',
    description:
      'A master list curated by expert item reviewers (u/pandapaxxy, u/mercules904, and u/HavocsCall). This is the default wishlist used by DIM.',
    githubUrl:
      'https://raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/voltron.txt',
    author: '48klocs'
  },
  {
    id: 'choosy-voltron',
    name: 'Choosy Voltron',
    description:
      'A more opinionated version of Voltron that will thumbs-down some of your items. Use this if you want stricter roll recommendations.',
    githubUrl:
      'https://raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/choosy_voltron.txt',
    author: '48klocs'
  },
  {
    id: 'jat-mnk',
    name: 'Just Another Team (MnK)',
    description: 'Mouse & Keyboard focused wishlist by Just Another Team',
    githubUrl:
      'https://raw.githubusercontent.com/dsf000z/JAT-wishlists-bundler/refs/heads/main/bundles/DIM/just-another-team-mnk.txt',
    author: 'Just Another Team'
  }
]

/**
 * Cache duration for checking updates (5 minutes)
 */
const UPDATE_CHECK_CACHE_MS = 5 * 60 * 1000

/**
 * In-memory cache for update status
 */
const updateStatusCache = new Map<string, { status: WishlistUpdateStatus; timestamp: number }>()

class PresetWishlistService {
  /**
   * Get all preset configurations
   */
  getPresetConfigs(): PresetWishlistConfig[] {
    return PRESET_WISHLISTS
  }

  /**
   * Get a specific preset configuration by ID
   */
  getPresetConfig(id: string): PresetWishlistConfig | undefined {
    return PRESET_WISHLISTS.find((p) => p.id === id)
  }

  /**
   * Fetch a wishlist from GitHub and parse it
   */
  async fetchWishlist(config: PresetWishlistConfig): Promise<Wishlist> {
    const response = await fetch(config.githubUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch wishlist ${config.name}: ${response.status}`)
    }

    const content = await response.text()
    const parsed = parseDimWishlist(content)
    const version = await computeContentHash(content)
    const stats = getWishlistStats(parsed.items)

    const wishlist: Wishlist = {
      id: config.id,
      name: config.name, // Always use our configured name for clarity
      description: config.description, // Always use our configured description for clarity
      sourceType: 'preset',
      sourceUrl: config.githubUrl,
      author: config.author,
      version,
      lastFetched: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      items: parsed.items
    }

    // Log stats for debugging
    console.log(
      `Fetched ${config.name}: ${stats.itemCount} items across ${stats.weaponCount} weapons`
    )

    return wishlist
  }

  /**
   * Check if a preset has updates available
   * Uses cached result if recent enough
   */
  async checkForUpdate(config: PresetWishlistConfig): Promise<WishlistUpdateStatus> {
    // Check cache first
    const cached = updateStatusCache.get(config.id)
    if (cached && Date.now() - cached.timestamp < UPDATE_CHECK_CACHE_MS) {
      return cached.status
    }

    try {
      // Fetch content and compute hash
      const response = await fetch(config.githubUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const content = await response.text()
      const remoteVersion = await computeContentHash(content)

      // Get local version
      const localInfo = wishlistStorageService.getPresetVersionInfo(config.id)

      const status: WishlistUpdateStatus = {
        wishlistId: config.id,
        hasUpdate: !localInfo || localInfo.version !== remoteVersion,
        currentVersion: localInfo?.version,
        remoteVersion,
        lastChecked: new Date().toISOString()
      }

      // Cache the result
      updateStatusCache.set(config.id, { status, timestamp: Date.now() })

      return status
    } catch (error) {
      console.warn(`Failed to check for updates for ${config.name}:`, error)

      // Return cached or unknown status
      const localInfo = wishlistStorageService.getPresetVersionInfo(config.id)
      return {
        wishlistId: config.id,
        hasUpdate: false, // Can't determine, assume no update
        currentVersion: localInfo?.version,
        lastChecked: new Date().toISOString()
      }
    }
  }

  /**
   * Check all presets for updates
   */
  async checkAllForUpdates(): Promise<WishlistUpdateStatus[]> {
    const statuses = await Promise.all(
      PRESET_WISHLISTS.map((config) => this.checkForUpdate(config))
    )
    return statuses
  }

  /**
   * Get a preset wishlist, fetching if not cached or if forceRefresh is true
   */
  async getPreset(id: string, forceRefresh = false): Promise<Wishlist | null> {
    const config = this.getPresetConfig(id)
    if (!config) return null

    // Check cache first
    if (!forceRefresh) {
      const cached = await wishlistStorageService.getPreset(id)
      if (cached) {
        return cached
      }
    }

    // Fetch from GitHub
    try {
      const wishlist = await this.fetchWishlist(config)
      await wishlistStorageService.savePreset(wishlist)
      return wishlist
    } catch (error) {
      console.error(`Failed to fetch preset ${id}:`, error)

      // Return cached if available, even if stale
      const cached = await wishlistStorageService.getPreset(id)
      if (cached) {
        console.log(`Using stale cache for ${id}`)
        return cached
      }

      throw error
    }
  }

  /**
   * Get all presets, fetching any that aren't cached
   */
  async getAllPresets(forceRefresh = false): Promise<Wishlist[]> {
    const wishlists: Wishlist[] = []

    for (const config of PRESET_WISHLISTS) {
      try {
        const wishlist = await this.getPreset(config.id, forceRefresh)
        if (wishlist) {
          wishlists.push(wishlist)
        }
      } catch (error) {
        console.warn(`Skipping preset ${config.id}:`, error)
      }
    }

    return wishlists
  }

  /**
   * Refresh a specific preset (force fetch)
   */
  async refreshPreset(id: string): Promise<Wishlist | null> {
    return this.getPreset(id, true)
  }

  /**
   * Clear update status cache
   */
  clearUpdateCache(): void {
    updateStatusCache.clear()
  }
}

export const presetWishlistService = new PresetWishlistService()
