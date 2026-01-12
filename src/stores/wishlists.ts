/**
 * Wishlists Pinia Store
 *
 * Manages state for DIM-compatible wishlists including:
 * - Preset wishlists (from GitHub)
 * - User-created wishlists
 * - Update status tracking
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Wishlist, WishlistItem, WishlistUpdateStatus } from '@/models/wishlist'
import { wishlistStorageService } from '@/services/wishlist-storage-service'
import {
  presetWishlistService,
  PRESET_WISHLISTS
} from '@/services/preset-wishlist-service'
import {
  parseDimWishlist,
  serializeToDimFormat,
  getWishlistStats,
  getItemsForWeapon
} from '@/services/dim-wishlist-parser'

export const useWishlistsStore = defineStore('wishlists', () => {
  // ==================== State ====================

  const presetWishlists = ref<Wishlist[]>([])
  const userWishlists = ref<Wishlist[]>([])
  const updateStatuses = ref<Map<string, WishlistUpdateStatus>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // ==================== Computed ====================

  const allWishlists = computed(() => [...presetWishlists.value, ...userWishlists.value])

  const hasUpdatesAvailable = computed(() =>
    Array.from(updateStatuses.value.values()).some((s) => s.hasUpdate)
  )

  const presetCount = computed(() => presetWishlists.value.length)
  const userCount = computed(() => userWishlists.value.length)

  // ==================== Actions ====================

  /**
   * Initialize the store - load from storage + optionally check for updates
   */
  async function initialize(checkUpdates = true): Promise<void> {
    if (initialized.value) return

    loading.value = true
    error.value = null

    try {
      // Load user wishlists from localStorage and IndexedDB
      await loadUserWishlists()

      // Load preset wishlists from IndexedDB cache
      const cachedPresets = await wishlistStorageService.getAllPresets()
      presetWishlists.value = cachedPresets

      // Check for updates in background
      if (checkUpdates) {
        checkForUpdates().catch(console.warn)
      }

      initialized.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize wishlists'
      console.error('Failed to initialize wishlists:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Load user wishlists from localStorage and IndexedDB
   */
  async function loadUserWishlists(): Promise<void> {
    userWishlists.value = await wishlistStorageService.getAllUserWishlistsAsync()
  }

  /**
   * Load preset wishlists, fetching from GitHub if not cached
   */
  async function loadPresets(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const presets = await presetWishlistService.getAllPresets()
      presetWishlists.value = presets
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load presets'
      console.error('Failed to load presets:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Check all presets for available updates
   */
  async function checkForUpdates(): Promise<void> {
    try {
      const statuses = await presetWishlistService.checkAllForUpdates()
      for (const status of statuses) {
        updateStatuses.value.set(status.wishlistId, status)
      }
    } catch (err) {
      console.warn('Failed to check for updates:', err)
    }
  }

  /**
   * Refresh a specific preset (force fetch from GitHub)
   */
  async function refreshPreset(id: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const wishlist = await presetWishlistService.refreshPreset(id)
      if (wishlist) {
        // Update in state
        const index = presetWishlists.value.findIndex((w) => w.id === id)
        if (index >= 0) {
          presetWishlists.value[index] = wishlist
        } else {
          presetWishlists.value.push(wishlist)
        }

        // Clear update status
        updateStatuses.value.delete(id)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to refresh preset'
      console.error('Failed to refresh preset:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Refresh all presets
   */
  async function refreshAllPresets(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const presets = await presetWishlistService.getAllPresets(true)
      presetWishlists.value = presets
      updateStatuses.value.clear()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to refresh presets'
      console.error('Failed to refresh presets:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new user wishlist
   */
  function createUserWishlist(name: string, description?: string): Wishlist {
    const wishlist: Wishlist = {
      id: crypto.randomUUID(),
      name,
      description,
      sourceType: 'user',
      lastUpdated: new Date().toISOString(),
      items: []
    }

    wishlistStorageService.saveUserWishlist(wishlist)
    userWishlists.value.push(wishlist)

    return wishlist
  }

  /**
   * Fork a preset to create a user wishlist copy
   */
  async function forkPreset(presetId: string, newName: string): Promise<Wishlist | null> {
    const preset = presetWishlists.value.find((w) => w.id === presetId)
    if (!preset) return null

    const forked: Wishlist = {
      id: crypto.randomUUID(),
      name: newName,
      description: `Forked from ${preset.name}`,
      sourceType: 'user',
      lastUpdated: new Date().toISOString(),
      items: preset.items.map((item) => ({
        ...item,
        id: crypto.randomUUID() // Generate new IDs for forked items
      }))
    }

    // Use async storage for large wishlists
    await wishlistStorageService.saveUserWishlistAsync(forked)
    userWishlists.value.push(forked)

    return forked
  }

  /**
   * Update a user wishlist
   */
  function updateUserWishlist(id: string, updates: Partial<Wishlist>): void {
    const index = userWishlists.value.findIndex((w) => w.id === id)
    if (index < 0) return

    const wishlist = userWishlists.value[index]
    if (wishlist.sourceType !== 'user') return // Can't update presets

    const updated = {
      ...wishlist,
      ...updates,
      lastUpdated: new Date().toISOString()
    }

    wishlistStorageService.saveUserWishlist(updated)
    userWishlists.value[index] = updated
  }

  /**
   * Delete a user wishlist
   */
  function deleteUserWishlist(id: string): void {
    const index = userWishlists.value.findIndex((w) => w.id === id)
    if (index < 0) return

    const wishlist = userWishlists.value[index]
    if (wishlist.sourceType !== 'user') return // Can't delete presets

    wishlistStorageService.deleteUserWishlist(id)
    userWishlists.value.splice(index, 1)
  }

  /**
   * Add an item to a user wishlist
   */
  function addItemToWishlist(wishlistId: string, item: WishlistItem): void {
    const wishlist = userWishlists.value.find((w) => w.id === wishlistId)
    if (!wishlist || wishlist.sourceType !== 'user') return

    wishlist.items.push(item)
    wishlist.lastUpdated = new Date().toISOString()
    wishlistStorageService.saveUserWishlist(wishlist)
  }

  /**
   * Remove an item from a user wishlist
   */
  function removeItemFromWishlist(wishlistId: string, itemId: string): void {
    const wishlist = userWishlists.value.find((w) => w.id === wishlistId)
    if (!wishlist || wishlist.sourceType !== 'user') return

    const index = wishlist.items.findIndex((i) => i.id === itemId)
    if (index >= 0) {
      wishlist.items.splice(index, 1)
      wishlist.lastUpdated = new Date().toISOString()
      wishlistStorageService.saveUserWishlist(wishlist)
    }
  }

  /**
   * Update an item in a user wishlist
   */
  function updateItemInWishlist(wishlistId: string, itemId: string, updates: Partial<WishlistItem>): void {
    const wishlist = userWishlists.value.find((w) => w.id === wishlistId)
    if (!wishlist || wishlist.sourceType !== 'user') return

    const item = wishlist.items.find((i) => i.id === itemId)
    if (item) {
      Object.assign(item, updates)
      wishlist.lastUpdated = new Date().toISOString()
      wishlistStorageService.saveUserWishlist(wishlist)
    }
  }

  /**
   * Get all wishlist items for a specific weapon across all wishlists
   */
  function getItemsForWeaponHash(
    weaponHash: number
  ): Array<{ wishlist: Wishlist; items: WishlistItem[] }> {
    const results: Array<{ wishlist: Wishlist; items: WishlistItem[] }> = []

    for (const wishlist of allWishlists.value) {
      const items = getItemsForWeapon(wishlist.items, weaponHash)
      if (items.length > 0) {
        results.push({ wishlist, items })
      }
    }

    return results
  }

  /**
   * Import a DIM format file as a user wishlist
   */
  function importDimFormat(content: string, name: string): Wishlist {
    const parsed = parseDimWishlist(content)
    const stats = getWishlistStats(parsed.items)

    const wishlist: Wishlist = {
      id: crypto.randomUUID(),
      name: parsed.title || name,
      description: parsed.description || `Imported wishlist with ${stats.itemCount} items`,
      sourceType: 'user',
      lastUpdated: new Date().toISOString(),
      items: parsed.items
    }

    wishlistStorageService.saveUserWishlist(wishlist)
    userWishlists.value.push(wishlist)

    return wishlist
  }

  /**
   * Export a wishlist to DIM format string
   */
  function exportToDimFormat(wishlistId: string): string | null {
    const wishlist = allWishlists.value.find((w) => w.id === wishlistId)
    if (!wishlist) return null

    return serializeToDimFormat(wishlist.items, {
      title: wishlist.name,
      description: wishlist.description
    })
  }

  /**
   * Get a wishlist by ID
   */
  function getWishlistById(id: string): Wishlist | undefined {
    return allWishlists.value.find((w) => w.id === id)
  }

  /**
   * Get preset configuration for UI display
   */
  function getPresetConfigs() {
    return PRESET_WISHLISTS
  }

  return {
    // State
    presetWishlists,
    userWishlists,
    updateStatuses,
    loading,
    error,
    initialized,

    // Computed
    allWishlists,
    hasUpdatesAvailable,
    presetCount,
    userCount,

    // Actions
    initialize,
    loadUserWishlists,
    loadPresets,
    checkForUpdates,
    refreshPreset,
    refreshAllPresets,
    createUserWishlist,
    forkPreset,
    updateUserWishlist,
    deleteUserWishlist,
    addItemToWishlist,
    removeItemFromWishlist,
    updateItemInWishlist,
    getItemsForWeaponHash,
    importDimFormat,
    exportToDimFormat,
    getWishlistById,
    getPresetConfigs
  }
})
