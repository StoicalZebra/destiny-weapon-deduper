/**
 * Wishlist Storage Service
 *
 * Manages wishlist persistence across two storage backends:
 * - Presets: IndexedDB (large files like Voltron ~10MB)
 * - User wishlists: IndexedDB for large wishlists (>1000 items), localStorage for small ones
 * - Version tracking: localStorage
 */

import { indexedDBStorage } from '@/utils/storage'
import { WISHLIST_USER_PREFIX, WISHLIST_VERSIONS_KEY, WISHLIST_ENABLED_STATES_KEY } from '@/utils/constants'
import type { Wishlist, WishlistUpdateStatus } from '@/models/wishlist'

// Threshold for storing in IndexedDB vs localStorage (number of items)
const LARGE_WISHLIST_THRESHOLD = 1000

/**
 * Version info stored for each preset wishlist
 */
interface WishlistVersionInfo {
  id: string
  version: string // Content hash
  lastFetched: string // ISO timestamp
}

class WishlistStorageService {
  // ==================== Preset Wishlists (IndexedDB) ====================

  /**
   * Save a preset wishlist to IndexedDB
   */
  async savePreset(wishlist: Wishlist): Promise<void> {
    await indexedDBStorage.setWishlist(wishlist)
    // Also save version info
    this.setPresetVersion(wishlist.id, wishlist.version || '', wishlist.lastFetched || '')
  }

  /**
   * Get a preset wishlist from IndexedDB
   */
  async getPreset(id: string): Promise<Wishlist | null> {
    const wishlist = await indexedDBStorage.getWishlist(id)
    // Only return if it's actually a preset
    if (wishlist && wishlist.sourceType === 'preset') {
      return wishlist
    }
    return null
  }

  /**
   * Get all preset wishlists from IndexedDB
   */
  async getAllPresets(): Promise<Wishlist[]> {
    const all = await indexedDBStorage.getAllWishlists()
    return all.filter((w) => w.sourceType === 'preset')
  }

  /**
   * Delete a preset wishlist from IndexedDB
   */
  async deletePreset(id: string): Promise<void> {
    await indexedDBStorage.deleteWishlist(id)
    this.removePresetVersion(id)
  }

  /**
   * Clear all preset wishlists
   */
  async clearPresets(): Promise<void> {
    const presets = await this.getAllPresets()
    for (const preset of presets) {
      await indexedDBStorage.deleteWishlist(preset.id)
    }
    localStorage.removeItem(WISHLIST_VERSIONS_KEY)
  }

  // ==================== User Wishlists (localStorage or IndexedDB for large) ====================

  /**
   * Get storage key for a user wishlist in localStorage
   */
  private getUserWishlistKey(id: string): string {
    return `${WISHLIST_USER_PREFIX}${id}`
  }

  /**
   * Get the key for tracking which user wishlists are stored in IndexedDB
   */
  private getLargeWishlistsKey(): string {
    return `${WISHLIST_USER_PREFIX}large_wishlists`
  }

  /**
   * Get IDs of user wishlists stored in IndexedDB
   */
  private getLargeUserWishlistIds(): string[] {
    const raw = localStorage.getItem(this.getLargeWishlistsKey())
    if (!raw) return []
    try {
      return JSON.parse(raw) as string[]
    } catch {
      return []
    }
  }

  /**
   * Mark a user wishlist as stored in IndexedDB
   */
  private markAsLargeWishlist(id: string): void {
    const ids = this.getLargeUserWishlistIds()
    if (!ids.includes(id)) {
      ids.push(id)
      localStorage.setItem(this.getLargeWishlistsKey(), JSON.stringify(ids))
    }
  }

  /**
   * Unmark a user wishlist from IndexedDB tracking
   */
  private unmarkAsLargeWishlist(id: string): void {
    const ids = this.getLargeUserWishlistIds().filter((i) => i !== id)
    localStorage.setItem(this.getLargeWishlistsKey(), JSON.stringify(ids))
  }

  /**
   * Check if a user wishlist is stored in IndexedDB (large)
   */
  private isLargeUserWishlist(id: string): boolean {
    return this.getLargeUserWishlistIds().includes(id)
  }

  /**
   * Save a user wishlist to localStorage (small) or IndexedDB (large)
   */
  async saveUserWishlistAsync(wishlist: Wishlist): Promise<void> {
    const isLarge = wishlist.items.length >= LARGE_WISHLIST_THRESHOLD

    if (isLarge) {
      // Store in IndexedDB for large wishlists
      await indexedDBStorage.setWishlist(wishlist)
      this.markAsLargeWishlist(wishlist.id)
      // Remove from localStorage if it was there before
      const key = this.getUserWishlistKey(wishlist.id)
      localStorage.removeItem(key)
    } else {
      // Store in localStorage for small wishlists
      const key = this.getUserWishlistKey(wishlist.id)
      localStorage.setItem(key, JSON.stringify(wishlist))
      // Remove from IndexedDB if it was there before
      if (this.isLargeUserWishlist(wishlist.id)) {
        await indexedDBStorage.deleteWishlist(wishlist.id)
        this.unmarkAsLargeWishlist(wishlist.id)
      }
    }
  }

  /**
   * Save a user wishlist (sync version for backward compatibility, falls back to async)
   */
  saveUserWishlist(wishlist: Wishlist): void {
    const isLarge = wishlist.items.length >= LARGE_WISHLIST_THRESHOLD

    if (isLarge) {
      // For large wishlists, we must use async - fire and forget
      this.saveUserWishlistAsync(wishlist).catch((err) => {
        console.error('Failed to save large user wishlist:', err)
      })
    } else {
      // Small wishlists can use localStorage synchronously
      const key = this.getUserWishlistKey(wishlist.id)
      localStorage.setItem(key, JSON.stringify(wishlist))
    }
  }

  /**
   * Get a user wishlist from localStorage or IndexedDB
   */
  getUserWishlist(id: string): Wishlist | null {
    // Check localStorage first (fast)
    const key = this.getUserWishlistKey(id)
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        return JSON.parse(raw) as Wishlist
      } catch {
        console.warn(`Failed to parse user wishlist ${id}`)
        return null
      }
    }
    // Note: For IndexedDB wishlists, use getUserWishlistAsync
    return null
  }

  /**
   * Get a user wishlist from localStorage or IndexedDB (async)
   */
  async getUserWishlistAsync(id: string): Promise<Wishlist | null> {
    // Check localStorage first
    const fromLocal = this.getUserWishlist(id)
    if (fromLocal) return fromLocal

    // Check IndexedDB for large wishlists
    if (this.isLargeUserWishlist(id)) {
      const wishlist = await indexedDBStorage.getWishlist(id)
      if (wishlist && wishlist.sourceType === 'user') {
        return wishlist
      }
    }
    return null
  }

  /**
   * Get all user wishlists from localStorage
   */
  getAllUserWishlists(): Wishlist[] {
    const wishlists: Wishlist[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(WISHLIST_USER_PREFIX) && key !== this.getLargeWishlistsKey()) {
        try {
          const raw = localStorage.getItem(key)
          if (raw) {
            const wishlist = JSON.parse(raw) as Wishlist
            wishlists.push(wishlist)
          }
        } catch {
          console.warn(`Failed to parse user wishlist at ${key}`)
        }
      }
    }

    return wishlists
  }

  /**
   * Get all user wishlists from both localStorage and IndexedDB
   */
  async getAllUserWishlistsAsync(): Promise<Wishlist[]> {
    // Get from localStorage
    const localWishlists = this.getAllUserWishlists()

    // Get large wishlists from IndexedDB
    const largeIds = this.getLargeUserWishlistIds()
    const largeWishlists: Wishlist[] = []

    for (const id of largeIds) {
      const wishlist = await indexedDBStorage.getWishlist(id)
      if (wishlist && wishlist.sourceType === 'user') {
        largeWishlists.push(wishlist)
      }
    }

    return [...localWishlists, ...largeWishlists]
  }

  /**
   * Delete a user wishlist from localStorage or IndexedDB
   */
  deleteUserWishlist(id: string): void {
    // Remove from localStorage
    const key = this.getUserWishlistKey(id)
    localStorage.removeItem(key)

    // Remove from IndexedDB if it's a large wishlist
    if (this.isLargeUserWishlist(id)) {
      indexedDBStorage.deleteWishlist(id).catch(console.warn)
      this.unmarkAsLargeWishlist(id)
    }
  }

  /**
   * Clear all user wishlists
   */
  async clearUserWishlists(): Promise<void> {
    // Clear from localStorage
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(WISHLIST_USER_PREFIX)) {
        keys.push(key)
      }
    }
    for (const key of keys) {
      localStorage.removeItem(key)
    }

    // Clear large wishlists from IndexedDB
    const largeIds = this.getLargeUserWishlistIds()
    for (const id of largeIds) {
      await indexedDBStorage.deleteWishlist(id)
    }
  }

  // ==================== Version Tracking ====================

  /**
   * Get all preset version info
   */
  private getAllVersionInfo(): WishlistVersionInfo[] {
    const raw = localStorage.getItem(WISHLIST_VERSIONS_KEY)
    if (!raw) return []

    try {
      return JSON.parse(raw) as WishlistVersionInfo[]
    } catch {
      return []
    }
  }

  /**
   * Save all version info
   */
  private saveAllVersionInfo(versions: WishlistVersionInfo[]): void {
    localStorage.setItem(WISHLIST_VERSIONS_KEY, JSON.stringify(versions))
  }

  /**
   * Get version info for a specific preset
   */
  getPresetVersionInfo(id: string): WishlistVersionInfo | null {
    const versions = this.getAllVersionInfo()
    return versions.find((v) => v.id === id) || null
  }

  /**
   * Set version info for a preset
   */
  setPresetVersion(id: string, version: string, lastFetched: string): void {
    const versions = this.getAllVersionInfo()
    const existing = versions.findIndex((v) => v.id === id)

    const info: WishlistVersionInfo = { id, version, lastFetched }

    if (existing >= 0) {
      versions[existing] = info
    } else {
      versions.push(info)
    }

    this.saveAllVersionInfo(versions)
  }

  /**
   * Remove version info for a preset
   */
  removePresetVersion(id: string): void {
    const versions = this.getAllVersionInfo().filter((v) => v.id !== id)
    this.saveAllVersionInfo(versions)
  }

  /**
   * Check if a preset has a newer version available
   */
  hasNewerVersion(id: string, remoteVersion: string): boolean {
    const local = this.getPresetVersionInfo(id)
    if (!local) return true // No local version means we need to fetch
    return local.version !== remoteVersion
  }

  /**
   * Get update status for all presets
   */
  getUpdateStatuses(remoteVersions: Map<string, string>): WishlistUpdateStatus[] {
    const statuses: WishlistUpdateStatus[] = []

    for (const [id, remoteVersion] of remoteVersions) {
      const local = this.getPresetVersionInfo(id)
      statuses.push({
        wishlistId: id,
        hasUpdate: local ? local.version !== remoteVersion : true,
        currentVersion: local?.version,
        remoteVersion,
        lastChecked: new Date().toISOString()
      })
    }

    return statuses
  }

  // ==================== Combined Operations ====================

  /**
   * Get all wishlists (presets + user)
   */
  async getAllWishlists(): Promise<Wishlist[]> {
    const [presets, userLists] = await Promise.all([
      this.getAllPresets(),
      Promise.resolve(this.getAllUserWishlists())
    ])
    return [...presets, ...userLists]
  }

  /**
   * Get a wishlist by ID (checks both storages)
   */
  async getWishlist(id: string): Promise<Wishlist | null> {
    // Try user wishlists first (faster, localStorage)
    const userWishlist = this.getUserWishlist(id)
    if (userWishlist) return userWishlist

    // Try presets (IndexedDB)
    return this.getPreset(id)
  }

  /**
   * Save a wishlist to the appropriate storage
   */
  async saveWishlist(wishlist: Wishlist): Promise<void> {
    if (wishlist.sourceType === 'preset') {
      await this.savePreset(wishlist)
    } else {
      this.saveUserWishlist(wishlist)
    }
  }

  /**
   * Delete a wishlist from the appropriate storage
   */
  async deleteWishlist(wishlist: Wishlist): Promise<void> {
    if (wishlist.sourceType === 'preset') {
      await this.deletePreset(wishlist.id)
    } else {
      this.deleteUserWishlist(wishlist.id)
    }
  }

  // ==================== Enabled States (Lightweight localStorage) ====================

  /**
   * Get all enabled states from localStorage
   * Returns a map of wishlistId -> enabled (only stores false values to save space)
   */
  getEnabledStates(): Map<string, boolean> {
    const raw = localStorage.getItem(WISHLIST_ENABLED_STATES_KEY)
    if (!raw) return new Map()
    try {
      const obj = JSON.parse(raw) as Record<string, boolean>
      return new Map(Object.entries(obj))
    } catch {
      return new Map()
    }
  }

  /**
   * Set the enabled state for a single wishlist (fast localStorage operation)
   */
  setEnabledState(wishlistId: string, enabled: boolean): void {
    const states = this.getEnabledStates()
    if (enabled) {
      // Remove from map when enabled (default is true)
      states.delete(wishlistId)
    } else {
      // Only store false values
      states.set(wishlistId, false)
    }
    const obj = Object.fromEntries(states)
    localStorage.setItem(WISHLIST_ENABLED_STATES_KEY, JSON.stringify(obj))
  }

  /**
   * Get the enabled state for a single wishlist
   */
  getEnabledState(wishlistId: string): boolean {
    const states = this.getEnabledStates()
    // Default to true if not in map
    return states.get(wishlistId) !== false
  }

  /**
   * Remove enabled state for a wishlist (when wishlist is deleted)
   */
  removeEnabledState(wishlistId: string): void {
    const states = this.getEnabledStates()
    states.delete(wishlistId)
    const obj = Object.fromEntries(states)
    localStorage.setItem(WISHLIST_ENABLED_STATES_KEY, JSON.stringify(obj))
  }
}

export const wishlistStorageService = new WishlistStorageService()
