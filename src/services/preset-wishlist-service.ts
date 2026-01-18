/**
 * Premade Wishlist Service
 *
 * Manages fetching and caching of premade wishlists from GitHub.
 * Note: Called "preset" internally for storage compatibility, shown as "Premade" in UI.
 * Includes update detection via content hashing.
 */

import type { Wishlist, PresetWishlistConfig, WishlistUpdateStatus } from '@/models/wishlist'
import { parseDimWishlist, computeContentHash } from './dim-wishlist-parser'
import { wishlistStorageService } from './wishlist-storage-service'

/**
 * Configured premade wishlists
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
    // In dev mode, use local file instead of GitHub (avoids CDN cache issues)
    localUrl: '/data/wishlists/StoicalZebra-wishlist.txt',
    author: 'StoicalZebra'
  },
  {
    id: 'voltron',
    name: 'Voltron',
    description:
      'A master list curated by expert item reviewers (u/pandapaxxy, u/mercules904, and u/HavocsCall). This is the default wishlist used by DIM.',
    githubUrl:
      'https://raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/voltron.txt',
    author: '48klocs',
    large: true // ~1200+ rolls, load on demand
  },
  {
    id: 'jat-mnk',
    name: 'Just Another Team (MnK)',
    description: 'Mouse & Keyboard focused wishlist by Just Another Team',
    githubUrl:
      'https://raw.githubusercontent.com/dsf000z/JAT-wishlists-bundler/refs/heads/main/bundles/DIM/just-another-team-mnk.txt',
    author: 'Just Another Team',
    large: true // Large community wishlist
  },
  {
    id: 'choosy-voltron',
    name: 'Choosy Voltron',
    description:
      'A curated subset of Voltron focusing on the most impactful perks for each weapon',
    githubUrl:
      'https://raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/choosy_voltron.txt',
    author: '48klocs',
    large: true
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

/**
 * Parse GitHub raw URL to extract owner, repo, and file path for API calls.
 * Supports both main URL formats:
 * - https://raw.githubusercontent.com/owner/repo/branch/path/file.txt
 * - https://raw.githubusercontent.com/owner/repo/refs/heads/branch/path/file.txt
 */
function parseGithubRawUrl(
  rawUrl: string
): { owner: string; repo: string; path: string } | null {
  // Match: raw.githubusercontent.com/owner/repo/...
  const match = rawUrl.match(
    /raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(?:refs\/heads\/)?[^/]+\/(.+)/
  )
  if (!match) return null
  return { owner: match[1], repo: match[2], path: match[3] }
}

/**
 * Fetch the latest commit date for a file from the GitHub API.
 * Returns null if the API call fails (non-critical).
 * Exported for use in background refresh.
 */
export async function fetchGithubCommitDate(rawUrl: string): Promise<string | null> {
  const parsed = parseGithubRawUrl(rawUrl)
  if (!parsed) return null

  try {
    const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?path=${encodeURIComponent(parsed.path)}&per_page=1`
    const response = await fetch(apiUrl)

    if (!response.ok) return null

    const data = await response.json()
    if (Array.isArray(data) && data.length > 0 && data[0].commit?.author?.date) {
      return data[0].commit.author.date
    }
  } catch {
    // Non-critical - just skip commit date
  }

  return null
}

class PresetWishlistService {
  /**
   * Get all preset configurations
   */
  getPresetConfigs(): PresetWishlistConfig[] {
    return PRESET_WISHLISTS
  }

  /**
   * Get preset configs for small wishlists (auto-load)
   */
  getSmallPresetConfigs(): PresetWishlistConfig[] {
    return PRESET_WISHLISTS.filter((p) => !p.large)
  }

  /**
   * Get preset configs for large wishlists (manual load)
   */
  getLargePresetConfigs(): PresetWishlistConfig[] {
    return PRESET_WISHLISTS.filter((p) => p.large)
  }

  /**
   * Get a specific preset configuration by ID
   */
  getPresetConfig(id: string): PresetWishlistConfig | undefined {
    return PRESET_WISHLISTS.find((p) => p.id === id)
  }

  /**
   * Fetch a wishlist from GitHub (or local file in dev mode) and parse it
   */
  async fetchWishlist(config: PresetWishlistConfig): Promise<Wishlist> {
    // In dev mode, use local file if available (avoids GitHub CDN cache issues)
    const isDev = import.meta.env.DEV
    const useLocalFile = isDev && config.localUrl
    const fetchUrl = useLocalFile ? config.localUrl! : config.githubUrl

    if (isDev) {
      console.log(`[preset-wishlist] Fetching ${config.id} from: ${fetchUrl}`)
    }

    // Fetch content and commit date in parallel
    // Skip commit date fetch for local files
    const [response, commitDate] = await Promise.all([
      fetch(fetchUrl),
      useLocalFile ? Promise.resolve(null) : fetchGithubCommitDate(config.githubUrl)
    ])

    if (!response.ok) {
      throw new Error(`Failed to fetch wishlist ${config.name}: ${response.status}`)
    }

    const content = await response.text()
    const parsed = parseDimWishlist(content)
    const version = await computeContentHash(content)

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
      githubCommitDate: commitDate || undefined,
      items: parsed.items
    }

    return wishlist
  }

  /**
   * Check if a preset has updates available
   * Uses cached result if recent enough
   *
   * Note: In dev mode, wishlists with localUrl skip update checks entirely
   * since the local file IS the source of truth.
   */
  async checkForUpdate(config: PresetWishlistConfig): Promise<WishlistUpdateStatus> {
    const isDev = import.meta.env.DEV

    // In dev mode, skip update checks for wishlists with local files
    // The local file is the source of truth, no need to check GitHub
    if (isDev && config.localUrl) {
      const localInfo = wishlistStorageService.getPresetVersionInfo(config.id)
      return {
        wishlistId: config.id,
        hasUpdate: false,
        currentVersion: localInfo?.version,
        lastChecked: new Date().toISOString()
      }
    }

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
        hasUpdate: localInfo !== null && localInfo.version !== remoteVersion,
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
      // Return cached if available, even if stale
      const cached = await wishlistStorageService.getPreset(id)
      if (cached) {
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
