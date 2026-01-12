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
import type { Wishlist, WishlistItem, WishlistUpdateStatus, WishlistTag } from '@/models/wishlist'
import { wishlistStorageService } from '@/services/wishlist-storage-service'
import {
  presetWishlistService,
  PRESET_WISHLISTS
} from '@/services/preset-wishlist-service'
import {
  parseDimWishlist,
  serializeToDimFormat,
  getWishlistStats,
  getItemsForWeapon,
  type GodRollSelection,
  type PerkColumnInfo,
  selectionToWishlistItem,
  wishlistItemToSelection
} from '@/services/dim-wishlist-parser'

export const useWishlistsStore = defineStore('wishlists', () => {
  // ==================== State ====================

  const presetWishlists = ref<Wishlist[]>([])
  const userWishlists = ref<Wishlist[]>([])
  const updateStatuses = ref<Map<string, WishlistUpdateStatus>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // Separate reactive state for enabled toggles (avoids re-scanning all items on toggle)
  // Key: wishlistId, Value: enabled (true/false). Missing = true (default enabled)
  const enabledStates = ref<Map<string, boolean>>(new Map())

  // Pre-computed weapon index for O(1) lookups instead of scanning all items
  // Structure: Map<wishlistId, Map<weaponHash, WishlistItem[]>>
  const weaponIndexes = ref<Map<string, Map<number, WishlistItem[]>>>(new Map())

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

      // Build weapon indexes for O(1) lookups (do this BEFORE applying enabled states)
      buildAllWeaponIndexes()

      // Apply enabled states from lightweight localStorage storage
      applyEnabledStates()

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
   * Apply enabled states from localStorage to the reactive Map
   */
  function applyEnabledStates(): void {
    const states = wishlistStorageService.getEnabledStates()
    // Copy to reactive Map (only stores false values, missing = true)
    enabledStates.value = new Map(states)
  }

  /**
   * Check if a wishlist is enabled (defaults to true if not in map)
   */
  function isWishlistEnabled(wishlistId: string): boolean {
    return enabledStates.value.get(wishlistId) !== false
  }

  /**
   * Build weapon index for a single wishlist (O(n) once, then O(1) lookups)
   */
  function buildWeaponIndex(wishlist: Wishlist): Map<number, WishlistItem[]> {
    const index = new Map<number, WishlistItem[]>()
    for (const item of wishlist.items) {
      const existing = index.get(item.weaponHash) || []
      existing.push(item)
      index.set(item.weaponHash, existing)
    }
    return index
  }

  /**
   * Build indexes for all wishlists (call after loading)
   */
  function buildAllWeaponIndexes(): void {
    const indexes = new Map<string, Map<number, WishlistItem[]>>()
    for (const wishlist of allWishlists.value) {
      indexes.set(wishlist.id, buildWeaponIndex(wishlist))
    }
    weaponIndexes.value = indexes
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
   * Get all wishlist items for a specific weapon across all enabled wishlists
   * Uses pre-built weapon indexes for O(1) lookups instead of scanning
   */
  function getItemsForWeaponHash(
    weaponHash: number
  ): Array<{ wishlist: Wishlist; items: WishlistItem[] }> {
    const results: Array<{ wishlist: Wishlist; items: WishlistItem[] }> = []

    for (const wishlist of allWishlists.value) {
      // Skip disabled wishlists using the separate reactive Map
      if (!isWishlistEnabled(wishlist.id)) continue

      // Use pre-built index for O(1) lookup instead of scanning all items
      const index = weaponIndexes.value.get(wishlist.id)
      const items = index?.get(weaponHash) || []
      if (items.length > 0) {
        results.push({ wishlist, items })
      }
    }

    return results
  }

  /**
   * Set whether a wishlist is enabled (contributes to perk annotations)
   * Only updates the separate enabledStates Map for instant reactivity
   */
  function setWishlistEnabled(wishlistId: string, enabled: boolean): void {
    // Update the separate reactive Map (doesn't touch wishlist objects)
    const newMap = new Map(enabledStates.value)
    if (enabled) {
      // Remove from map when enabled (default is true)
      newMap.delete(wishlistId)
    } else {
      newMap.set(wishlistId, false)
    }
    enabledStates.value = newMap

    // Persist to localStorage
    wishlistStorageService.setEnabledState(wishlistId, enabled)
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

  // ==================== God Roll Creator Integration ====================

  const DEFAULT_USER_WISHLIST_NAME = 'My God Rolls'

  /**
   * Get or create the default "My God Rolls" user wishlist
   */
  function getOrCreateDefaultWishlist(): Wishlist {
    // Look for existing default wishlist
    const existing = userWishlists.value.find((w) => w.name === DEFAULT_USER_WISHLIST_NAME)
    if (existing) return existing

    // Create new default wishlist
    return createUserWishlist(
      DEFAULT_USER_WISHLIST_NAME,
      'Personal god rolls created with the God Roll Creator'
    )
  }

  /**
   * Save a god roll selection to the default user wishlist
   * Returns the created/updated WishlistItem
   */
  function saveGodRollSelection(
    selection: GodRollSelection,
    weaponHash: number,
    perkColumns: PerkColumnInfo[],
    options?: {
      notes?: string
      tags?: WishlistTag[]
      existingItemId?: string // If updating existing item
    }
  ): WishlistItem {
    const wishlist = getOrCreateDefaultWishlist()

    const item = selectionToWishlistItem(selection, weaponHash, perkColumns, {
      notes: options?.notes,
      tags: options?.tags,
      existingId: options?.existingItemId
    })

    if (options?.existingItemId) {
      // Update existing item
      updateItemInWishlist(wishlist.id, options.existingItemId, {
        perkHashes: item.perkHashes,
        notes: item.notes,
        tags: item.tags
      })
    } else {
      // Add new item
      addItemToWishlist(wishlist.id, item)
    }

    return item
  }

  /**
   * Load a wishlist item into God Roll Creator selection format
   */
  function loadWishlistItemAsSelection(
    item: WishlistItem,
    perkColumns: PerkColumnInfo[]
  ): GodRollSelection {
    return wishlistItemToSelection(item, perkColumns)
  }

  /**
   * Get user wishlist items for a specific weapon (for God Roll Creator display)
   */
  function getUserItemsForWeapon(weaponHash: number): WishlistItem[] {
    const items: WishlistItem[] = []
    for (const wishlist of userWishlists.value) {
      items.push(...getItemsForWeapon(wishlist.items, weaponHash))
    }
    return items
  }

  /**
   * Delete a god roll from the default user wishlist
   */
  function deleteGodRoll(itemId: string): boolean {
    const wishlist = userWishlists.value.find((w) => w.name === DEFAULT_USER_WISHLIST_NAME)
    if (!wishlist) return false

    const itemExists = wishlist.items.some((i) => i.id === itemId)
    if (!itemExists) return false

    removeItemFromWishlist(wishlist.id, itemId)
    return true
  }

  // ==================== Legacy Migration ====================

  const LEGACY_STORAGE_PREFIX = 'd3_godroll_'

  /**
   * Check if there are legacy god rolls to migrate
   */
  function hasLegacyGodRolls(): boolean {
    return Object.keys(localStorage).some((k) => k.startsWith(LEGACY_STORAGE_PREFIX))
  }

  /**
   * Get stats about legacy god rolls awaiting migration
   */
  function getLegacyGodRollStats(): { weaponCount: number; rollCount: number } {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(LEGACY_STORAGE_PREFIX))
    let rollCount = 0

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const profiles = JSON.parse(raw) as Array<{ id: string; selection: Record<number, string> }>
          rollCount += profiles.length
        }
      } catch {
        // Skip invalid entries
      }
    }

    return { weaponCount: keys.length, rollCount }
  }

  /**
   * Migrate legacy god rolls to the new wishlist format
   * Returns number of items migrated
   */
  function migrateLegacyGodRolls(): { migrated: number; errors: string[] } {
    const errors: string[] = []
    let migrated = 0

    const keys = Object.keys(localStorage).filter((k) => k.startsWith(LEGACY_STORAGE_PREFIX))
    if (keys.length === 0) {
      return { migrated: 0, errors: [] }
    }

    // Get or create the target wishlist
    const wishlist = getOrCreateDefaultWishlist()

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue

        const weaponHash = Number(key.replace(LEGACY_STORAGE_PREFIX, ''))
        if (isNaN(weaponHash)) {
          errors.push(`Invalid weapon hash in key: ${key}`)
          continue
        }

        interface LegacyProfile {
          id: string
          name: string
          notes?: string
          selection: Record<number, 'OR' | 'AND'>
          isFromCommunityPick?: boolean
        }

        const profiles = JSON.parse(raw) as LegacyProfile[]

        for (const profile of profiles) {
          // Convert selection to perk hashes array
          // Legacy format: { perkHash: 'AND'|'OR' }
          const perkHashes = Object.keys(profile.selection).map(Number)

          if (perkHashes.length === 0) continue

          // Build notes combining name and notes
          let notes = ''
          if (profile.name) {
            notes = profile.name
          }
          if (profile.notes) {
            notes = notes ? `${notes}: ${profile.notes}` : profile.notes
          }
          if (profile.isFromCommunityPick) {
            notes = notes ? `${notes} (from Community Pick)` : '(from Community Pick)'
          }

          const item: WishlistItem = {
            id: crypto.randomUUID(),
            weaponHash,
            perkHashes,
            notes: notes || undefined,
            tags: []
          }

          // Check for duplicate (same weapon + same perks)
          const existingItems = getItemsForWeapon(wishlist.items, weaponHash)
          const isDuplicate = existingItems.some((existing) => {
            if (existing.perkHashes.length !== perkHashes.length) return false
            const existingSet = new Set(existing.perkHashes)
            return perkHashes.every((h) => existingSet.has(h))
          })

          if (!isDuplicate) {
            addItemToWishlist(wishlist.id, item)
            migrated++
          }
        }

        // Remove migrated key from localStorage
        localStorage.removeItem(key)
      } catch (err) {
        errors.push(`Failed to migrate ${key}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return { migrated, errors }
  }

  /**
   * Clear all legacy god roll data without migrating
   */
  function clearLegacyGodRolls(): number {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(LEGACY_STORAGE_PREFIX))
    for (const key of keys) {
      localStorage.removeItem(key)
    }
    return keys.length
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
    setWishlistEnabled,
    isWishlistEnabled,
    importDimFormat,
    exportToDimFormat,
    getWishlistById,
    getPresetConfigs,

    // God Roll Creator integration
    getOrCreateDefaultWishlist,
    saveGodRollSelection,
    loadWishlistItemAsSelection,
    getUserItemsForWeapon,
    deleteGodRoll,

    // Legacy migration
    hasLegacyGodRolls,
    getLegacyGodRollStats,
    migrateLegacyGodRolls,
    clearLegacyGodRolls
  }
})
