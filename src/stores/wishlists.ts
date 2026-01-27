/**
 * Wishlists Pinia Store
 *
 * Manages state for DIM-compatible wishlists including:
 * - Premade wishlists (from GitHub, stored internally as 'preset')
 * - Custom wishlists (user-created, stored as 'user')
 * - Update status tracking
 */

import { defineStore } from 'pinia'
import { ref, computed, triggerRef } from 'vue'
import type { Wishlist, WishlistItem, WishlistUpdateStatus, WishlistTag } from '@/models/wishlist'
import { wishlistStorageService } from '@/services/wishlist-storage-service'
import { useAuthStore } from '@/stores/auth'
import {
  presetWishlistService,
  PRESET_WISHLISTS,
  fetchGithubCommitDate
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
import { manifestService } from '@/services/manifest-service'
import { isWishlistEditable } from '@/utils/admin'
import { deduplicateWishlistItems } from '@/utils/wishlist-consolidation'

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

  // Track local edits to premade wishlists (legacy - no longer used with fork model)
  // Kept for backward compatibility
  // Using a plain object instead of Map for better Vue reactivity (Map.get() doesn't trigger updates)
  const hasUnsavedPresetChanges = ref<Record<string, boolean>>({})

  // ==================== Computed ====================

  const allWishlists = computed(() => [...presetWishlists.value, ...userWishlists.value])

  const hasUpdatesAvailable = computed(() =>
    Array.from(updateStatuses.value.values()).some((s) => s.hasUpdate)
  )

  const presetCount = computed(() => presetWishlists.value.length)
  const userCount = computed(() => userWishlists.value.length)

  // Only allow one custom wishlist - users can rename it but not create more
  const canCreateUserWishlist = computed(() => userWishlists.value.length === 0)

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

      // Load premade wishlists
      // In dev mode, use getPreset() which fetches fresh from local files
      // In production, use cached data from IndexedDB
      const isDev = import.meta.env.DEV
      const smallPresetConfigs = presetWishlistService.getSmallPresetConfigs()

      if (isDev) {
        // Dev mode: fetch all small presets through service (handles local file refresh)
        const fetchedPresets = await Promise.all(
          smallPresetConfigs.map(async (config) => {
            try {
              return await presetWishlistService.getPreset(config.id)
            } catch (err) {
              console.warn(`Failed to fetch preset ${config.id}:`, err)
              return null
            }
          })
        )
        presetWishlists.value = fetchedPresets.filter((p): p is Wishlist => p !== null)
      } else {
        // Production: use cached data, only fetch missing
        const cachedPresets = await wishlistStorageService.getAllPresets()
        const smallPresetIds = smallPresetConfigs.map((c) => c.id)
        const cachedIds = new Set(cachedPresets.map((p) => p.id))
        const missingSmallPresets = smallPresetIds.filter((id) => !cachedIds.has(id))

        if (missingSmallPresets.length > 0) {
          // Fetch missing small presets
          const fetchedPresets = await Promise.all(
            missingSmallPresets.map(async (id) => {
              try {
                return await presetWishlistService.getPreset(id)
              } catch (err) {
                console.warn(`Failed to fetch preset ${id}:`, err)
                return null
              }
            })
          )
          const validFetched = fetchedPresets.filter((p): p is Wishlist => p !== null)
          presetWishlists.value = [...cachedPresets, ...validFetched]
        } else {
          presetWishlists.value = cachedPresets
        }
      }

      // Build weapon indexes for O(1) lookups (do this BEFORE applying enabled states)
      buildAllWeaponIndexes()

      // Apply enabled states from lightweight localStorage storage
      applyEnabledStates()

      // Check for updates in background
      if (checkUpdates) {
        checkForUpdates().catch(() => {})
      }

      // Background refresh: update commit dates for preset wishlists
      refreshPresetMetadata().catch(() => {})

      initialized.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize wishlists'
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
   * By default only loads small presets; large ones require explicit loadLargePreset() call
   */
  async function loadPresets(includeLarge = false): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const configs = includeLarge
        ? presetWishlistService.getPresetConfigs()
        : presetWishlistService.getSmallPresetConfigs()

      const presets: Wishlist[] = []
      for (const config of configs) {
        try {
          const wishlist = await presetWishlistService.getPreset(config.id)
          if (wishlist) {
            presets.push(wishlist)
          }
        } catch (err) {
          console.warn(`Skipping preset ${config.id}:`, err)
        }
      }
      presetWishlists.value = presets

      // Rebuild indexes after loading
      buildAllWeaponIndexes()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load presets'
    } finally {
      loading.value = false
    }
  }

  /**
   * Load a specific large preset on demand
   */
  async function loadLargePreset(presetId: string): Promise<Wishlist | null> {
    const config = presetWishlistService.getLargePresetConfigs().find((c) => c.id === presetId)
    if (!config) return null

    // Check if already loaded
    if (presetWishlists.value.some((w) => w.id === presetId)) {
      return presetWishlists.value.find((w) => w.id === presetId) || null
    }

    loading.value = true
    error.value = null

    try {
      const wishlist = await presetWishlistService.getPreset(presetId, true)
      if (wishlist) {
        presetWishlists.value.push(wishlist)
        weaponIndexes.value.set(wishlist.id, buildWeaponIndex(wishlist))
      }
      return wishlist
    } catch (err) {
      error.value = err instanceof Error ? err.message : `Failed to load ${config.name}`
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Get configs for large presets that haven't been loaded yet
   */
  function getUnloadedLargePresetConfigs() {
    const loadedIds = new Set(presetWishlists.value.map((w) => w.id))
    return presetWishlistService.getLargePresetConfigs().filter((c) => !loadedIds.has(c.id))
  }

  /**
   * Unload a large preset to free up storage space
   * The preset can be re-loaded later from the "Large Wishlists" section
   */
  async function unloadLargePreset(presetId: string): Promise<void> {
    const config = presetWishlistService.getLargePresetConfigs().find((c) => c.id === presetId)
    if (!config) return // Not a large preset

    const index = presetWishlists.value.findIndex((w) => w.id === presetId)
    if (index < 0) return // Not loaded

    // Remove from IndexedDB
    await wishlistStorageService.deletePreset(presetId)

    // Remove from in-memory state
    presetWishlists.value.splice(index, 1)

    // Clean up related state
    weaponIndexes.value.delete(presetId)
    enabledStates.value.delete(presetId)
    wishlistStorageService.removeEnabledState(presetId)
    updateStatuses.value.delete(presetId)
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
      triggerRef(updateStatuses)
    } catch {
      // Background check failed - not critical
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
    } finally {
      loading.value = false
    }
  }

  /**
   * Background refresh: update commit dates for all loaded preset wishlists
   * This runs silently without blocking the UI or showing loading states
   */
  async function refreshPresetMetadata(): Promise<void> {
    // Update commit dates in parallel for all loaded presets
    const updatePromises = presetWishlists.value.map(async (wishlist) => {
      if (wishlist.sourceType !== 'preset' || !wishlist.sourceUrl) return

      try {
        const commitDate = await fetchGithubCommitDate(wishlist.sourceUrl)
        if (commitDate && commitDate !== wishlist.githubCommitDate) {
          // Update in-memory state
          wishlist.githubCommitDate = commitDate
          // Persist to storage
          await wishlistStorageService.savePreset(wishlist)
        }
      } catch {
        // Silent failure - metadata refresh is non-critical
      }
    })

    await Promise.all(updatePromises)
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
  async function forkPreset(
    presetId: string,
    newName: string,
    newDescription?: string
  ): Promise<Wishlist | null> {
    const preset = presetWishlists.value.find((w) => w.id === presetId)
    if (!preset) return null

    // Deduplicate items before forking - preset wishlists often have duplicate
    // entries for the same roll (normal + holofoil variants) for DIM compatibility,
    // but user wishlists don't need these duplicates
    const dedupedItems = deduplicateWishlistItems(preset.items)

    const forked: Wishlist = {
      id: crypto.randomUUID(),
      name: newName,
      description: newDescription || `Based on ${preset.name}`,
      sourceType: 'user',
      lastUpdated: new Date().toISOString(),
      items: dedupedItems.map((item) => ({
        ...item,
        id: crypto.randomUUID() // Generate new IDs for forked items
      }))
    }

    // Use async storage for large wishlists
    await wishlistStorageService.saveUserWishlistAsync(forked)
    userWishlists.value.push(forked)

    // Build weapon index for the new wishlist
    weaponIndexes.value.set(forked.id, buildWeaponIndex(forked))

    return forked
  }

  /**
   * Update a user wishlist
   */
  function updateUserWishlist(id: string, updates: Partial<Wishlist>): void {
    const index = userWishlists.value.findIndex((w) => w.id === id)
    if (index < 0) return

    const wishlist = userWishlists.value[index]
    if (wishlist.sourceType !== 'user') return // Can't update premade wishlists directly

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
    if (wishlist.sourceType !== 'user') return // Can't delete premade wishlists

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

    // Rebuild weapon index for this wishlist
    weaponIndexes.value.set(wishlistId, buildWeaponIndex(wishlist))
  }

  /**
   * Remove an item from a user wishlist
   */
  function removeItemFromWishlist(wishlistId: string, itemId: string): void {
    const wishlistIndex = userWishlists.value.findIndex((w) => w.id === wishlistId)
    if (wishlistIndex < 0) return

    const wishlist = userWishlists.value[wishlistIndex]
    if (wishlist.sourceType !== 'user') return

    const itemIndex = wishlist.items.findIndex((i) => i.id === itemId)
    if (itemIndex >= 0) {
      // Create new items array without the removed item (triggers Vue reactivity)
      const newItems = [
        ...wishlist.items.slice(0, itemIndex),
        ...wishlist.items.slice(itemIndex + 1)
      ]

      // Replace wishlist object to ensure Vue detects the change
      const updatedWishlist: Wishlist = {
        ...wishlist,
        items: newItems,
        lastUpdated: new Date().toISOString()
      }

      userWishlists.value[wishlistIndex] = updatedWishlist
      wishlistStorageService.saveUserWishlist(updatedWishlist)

      // Rebuild weapon index for this wishlist
      weaponIndexes.value.set(wishlistId, buildWeaponIndex(updatedWishlist))
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

      // Rebuild weapon index for this wishlist (perkHashes may have changed)
      weaponIndexes.value.set(wishlistId, buildWeaponIndex(wishlist))
    }
  }

  // ==================== Premade Wishlist Editing ====================

  /**
   * Check if a preset has unsaved local changes
   */
  function hasLocalChanges(wishlistId: string): boolean {
    return hasUnsavedPresetChanges.value[wishlistId] ?? false
  }

  /**
   * Mark a preset's changes as saved (call after export)
   */
  function markChangesSaved(wishlistId: string): void {
    hasUnsavedPresetChanges.value[wishlistId] = false
  }

  /**
   * Add an item to a preset wishlist (if editable based on size)
   */
  async function addItemToPreset(wishlistId: string, item: WishlistItem): Promise<boolean> {
    const wishlist = presetWishlists.value.find((w) => w.id === wishlistId)
    if (!wishlist || !isWishlistEditable(wishlist)) return false

    // Add to wishlist
    wishlist.items.push(item)
    wishlist.lastUpdated = new Date().toISOString()

    // Mark as having unsaved changes
    hasUnsavedPresetChanges.value[wishlistId] = true

    // Rebuild weapon index for this wishlist
    weaponIndexes.value.set(wishlistId, buildWeaponIndex(wishlist))

    // Persist locally (don't sync to GitHub - that's manual export)
    await wishlistStorageService.savePreset(wishlist)

    return true
  }

  /**
   * Remove an item from a preset wishlist (if editable based on size)
   */
  async function removeItemFromPreset(wishlistId: string, itemId: string): Promise<boolean> {
    const wishlist = presetWishlists.value.find((w) => w.id === wishlistId)
    if (!wishlist || !isWishlistEditable(wishlist)) return false

    const index = wishlist.items.findIndex((i) => i.id === itemId)
    if (index < 0) return false

    wishlist.items.splice(index, 1)
    wishlist.lastUpdated = new Date().toISOString()

    hasUnsavedPresetChanges.value[wishlistId] = true
    weaponIndexes.value.set(wishlistId, buildWeaponIndex(wishlist))
    await wishlistStorageService.savePreset(wishlist)

    return true
  }

  /**
   * Update an item in a preset wishlist (if editable based on size)
   */
  async function updateItemInPreset(
    wishlistId: string,
    itemId: string,
    updates: Partial<WishlistItem>
  ): Promise<boolean> {
    const wishlist = presetWishlists.value.find((w) => w.id === wishlistId)
    if (!wishlist || !isWishlistEditable(wishlist)) return false

    const item = wishlist.items.find((i) => i.id === itemId)
    if (!item) return false

    Object.assign(item, updates)
    wishlist.lastUpdated = new Date().toISOString()

    hasUnsavedPresetChanges.value[wishlistId] = true
    weaponIndexes.value.set(wishlistId, buildWeaponIndex(wishlist))
    await wishlistStorageService.savePreset(wishlist)

    return true
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
   * Get all wishlist items for a weapon and its variants (e.g., holofoil + normal)
   * Checks all variant hashes to find matching wishlist items
   *
   * Applies two-phase deduplication:
   * 1. ID-based: by variantGroupId (user entries) or item.id (avoids exact duplicates)
   * 2. Content-based: by perkHashes + notes (catches preset wishlists with separate
   *    entries for normal/holofoil that define the same roll)
   */
  function getItemsForWeaponVariants(
    variantHashes: number[]
  ): Array<{ wishlist: Wishlist; items: WishlistItem[] }> {
    const results: Array<{ wishlist: Wishlist; items: WishlistItem[] }> = []

    for (const wishlist of allWishlists.value) {
      if (!isWishlistEnabled(wishlist.id)) continue

      const index = weaponIndexes.value.get(wishlist.id)
      if (!index) continue

      // Phase 1: ID-based deduplication
      // Track seen items - dedupe by variantGroupId if present, otherwise by id
      const seenGroups = new Set<string>()
      const seenIds = new Set<string>()

      // Collect items matching ANY variant hash
      const matchingItems: WishlistItem[] = []
      for (const hash of variantHashes) {
        const items = index.get(hash) || []
        for (const item of items) {
          // Dedupe: if item has variantGroupId, only include one per group
          if (item.variantGroupId) {
            if (seenGroups.has(item.variantGroupId)) continue
            seenGroups.add(item.variantGroupId)
          } else {
            if (seenIds.has(item.id)) continue
            seenIds.add(item.id)
          }
          matchingItems.push(item)
        }
      }

      // Phase 2: Content-based deduplication
      // Removes duplicate rolls that have same perks + notes but different IDs
      // (common in preset wishlists that define same roll for multiple weapon hashes)
      const dedupedItems = deduplicateWishlistItems(matchingItems)

      if (dedupedItems.length > 0) {
        results.push({ wishlist, items: dedupedItems })
      }
    }

    return results
  }

  /**
   * Get deduplicated item count per wishlist for a weapon and its variants.
   * Unlike getItemsForWeaponVariants, this checks ALL wishlists (not just enabled ones)
   * and returns counts rather than full items.
   *
   * Used by WishlistsApplied to show "X rolls" per wishlist in the toggle UI.
   *
   * Applies same two-phase deduplication as getItemsForWeaponVariants:
   * 1. ID-based: by variantGroupId or item.id
   * 2. Content-based: by perkHashes + notes
   */
  function getItemCountsForWeaponVariants(
    variantHashes: number[]
  ): Array<{ wishlist: Wishlist; itemCount: number }> {
    const results: Array<{ wishlist: Wishlist; itemCount: number }> = []

    for (const wishlist of allWishlists.value) {
      const index = weaponIndexes.value.get(wishlist.id)
      if (!index) continue

      // Phase 1: ID-based deduplication
      const seenGroups = new Set<string>()
      const seenIds = new Set<string>()
      const matchingItems: WishlistItem[] = []

      for (const hash of variantHashes) {
        const items = index.get(hash) || []
        for (const item of items) {
          if (item.variantGroupId) {
            if (seenGroups.has(item.variantGroupId)) continue
            seenGroups.add(item.variantGroupId)
          } else {
            if (seenIds.has(item.id)) continue
            seenIds.add(item.id)
          }
          matchingItems.push(item)
        }
      }

      // Phase 2: Content-based deduplication
      const dedupedItems = deduplicateWishlistItems(matchingItems)

      if (dedupedItems.length > 0) {
        results.push({ wishlist, itemCount: dedupedItems.length })
      }
    }

    return results
  }

  /**
   * Set whether a wishlist is enabled (contributes to perk annotations)
   * Only updates the separate enabledStates Map for instant reactivity
   */
  function setWishlistEnabled(wishlistId: string, enabled: boolean): void {
    // Mutate map directly and trigger reactivity (avoids recreating Map)
    if (enabled) {
      // Remove from map when enabled (default is true)
      enabledStates.value.delete(wishlistId)
    } else {
      enabledStates.value.set(wishlistId, false)
    }
    triggerRef(enabledStates)

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
   * Outputs one line per variant hash for multi-hash weapons (e.g., holofoil + normal)
   * Includes weapon name comments and groups by contributor when manifest is loaded
   */
  function exportToDimFormat(wishlistId: string): string | null {
    const wishlist = allWishlists.value.find((w) => w.id === wishlistId)
    if (!wishlist) return null

    return serializeToDimFormat(wishlist.items, {
      title: wishlist.name,
      description: wishlist.description,
      // Pass variant lookup so multi-hash weapons export all variant hashes
      getVariantHashes: (hash: number) => manifestService.getWeaponVariantHashes(hash),
      // Pass weapon name lookup for human-readable comments
      getWeaponName: (hash: number) => {
        const item = manifestService.getInventoryItem(hash)
        return item?.displayProperties?.name
      },
      // Pass weapon type lookup for comments
      getWeaponType: (hash: number) => {
        const item = manifestService.getInventoryItem(hash)
        return item?.itemTypeDisplayName
      }
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
   * Get or create the default user wishlist for saving god rolls.
   * Returns the user's existing custom wishlist if one exists,
   * otherwise creates a new "My God Rolls" wishlist.
   */
  function getOrCreateDefaultWishlist(): Wishlist {
    // If user has any custom wishlist, use it (single wishlist model)
    if (userWishlists.value.length > 0) {
      return userWishlists.value[0]
    }

    // Create new default wishlist only if no user wishlists exist
    return createUserWishlist(
      DEFAULT_USER_WISHLIST_NAME,
      'Personal god rolls created with the God Roll Creator'
    )
  }

  /**
   * Get the current user's Bungie display name for attribution
   */
  function getBungieDisplayName(): string | undefined {
    const authStore = useAuthStore()
    const membership = authStore.selectedMembership
    if (!membership) return undefined

    // Format as "Name#Code" (e.g., "Guardian#1234")
    if (membership.bungieGlobalDisplayName && membership.bungieGlobalDisplayNameCode) {
      return `${membership.bungieGlobalDisplayName}#${membership.bungieGlobalDisplayNameCode}`
    }
    return membership.displayName || undefined
  }

  /**
   * Save a god roll selection to the default user wishlist
   * Creates entries for ALL variant hashes so the roll works for any weapon variant
   * Uses manifest to find ALL known variants, not just user-owned ones
   * Returns the primary WishlistItem (first variant hash)
   */
  function saveGodRollSelection(
    selection: GodRollSelection,
    weaponHash: number,
    perkColumns: PerkColumnInfo[],
    options?: {
      notes?: string
      tags?: WishlistTag[]
      youtubeLink?: string
      youtubeAuthor?: string
      youtubeTimestamp?: string
      existingItemId?: string // If updating existing item
      variantHashes?: number[] // User-owned variant hashes (optional, manifest used for full list)
    }
  ): WishlistItem {
    const wishlist = getOrCreateDefaultWishlist()
    const createdBy = getBungieDisplayName()

    // Get ALL known variants from manifest (not just user-owned ones)
    // This ensures rolls work for anyone who owns ANY variant of the weapon
    const manifestVariants = manifestService.getWeaponVariantHashes(weaponHash)

    // Combine manifest variants with user-provided ones (in case manifest is incomplete)
    const hashesToSave = new Set(manifestVariants)
    if (options?.variantHashes) {
      for (const hash of options.variantHashes) {
        hashesToSave.add(hash)
      }
    }
    const allHashes = Array.from(hashesToSave)

    // Generate a group ID to link all variant entries
    const variantGroupId = allHashes.length > 1 ? crypto.randomUUID() : undefined

    if (options?.existingItemId) {
      // Update existing item and all its variant group members
      const existingItem = wishlist.items.find(i => i.id === options.existingItemId)
      const groupId = existingItem?.variantGroupId

      // Find all items in the same variant group
      const itemsToUpdate = groupId
        ? wishlist.items.filter(i => i.variantGroupId === groupId)
        : wishlist.items.filter(i => i.id === options.existingItemId)

      const updates = {
        perkHashes: selectionToWishlistItem(selection, weaponHash, perkColumns, {}).perkHashes,
        notes: options?.notes,
        tags: options?.tags,
        youtubeLink: options?.youtubeLink,
        youtubeAuthor: options?.youtubeAuthor,
        youtubeTimestamp: options?.youtubeTimestamp,
        updatedAt: new Date().toISOString()
        // Note: createdBy is intentionally NOT updated on edits
      }

      // Update all variant entries
      for (const item of itemsToUpdate) {
        updateItemInWishlist(wishlist.id, item.id, updates)
      }

      // Return the primary item
      return { ...existingItem!, ...updates }
    } else {
      // Create new entries - one per variant hash
      let primaryItem: WishlistItem | null = null

      for (const hash of allHashes) {
        const item = selectionToWishlistItem(selection, hash, perkColumns, {
          notes: options?.notes,
          tags: options?.tags,
          youtubeLink: options?.youtubeLink,
          youtubeAuthor: options?.youtubeAuthor,
          youtubeTimestamp: options?.youtubeTimestamp,
          createdBy
        })

        // Add variantGroupId to link entries
        if (variantGroupId) {
          item.variantGroupId = variantGroupId
        }

        addItemToWishlist(wishlist.id, item)

        // First entry is the "primary" one we return
        if (!primaryItem) {
          primaryItem = item
        }
      }

      return primaryItem!
    }
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
   * Delete a god roll from the user's custom wishlist
   * Also deletes all variant group members (entries for other weapon hashes)
   */
  function deleteGodRoll(itemId: string): boolean {
    // Use the first (and only) user wishlist
    const wishlist = userWishlists.value[0]
    if (!wishlist) return false

    const item = wishlist.items.find((i) => i.id === itemId)
    if (!item) return false

    // If item has a variantGroupId, delete all items in the group
    if (item.variantGroupId) {
      const groupItems = wishlist.items.filter(i => i.variantGroupId === item.variantGroupId)
      for (const groupItem of groupItems) {
        removeItemFromWishlist(wishlist.id, groupItem.id)
      }
    } else {
      // Single item, no variants
      removeItemFromWishlist(wishlist.id, itemId)
    }

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
    enabledStates,
    loading,
    error,
    initialized,

    // Computed
    allWishlists,
    hasUpdatesAvailable,
    presetCount,
    userCount,
    canCreateUserWishlist,

    // Actions
    initialize,
    loadUserWishlists,
    loadPresets,
    loadLargePreset,
    getUnloadedLargePresetConfigs,
    unloadLargePreset,
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
    getItemsForWeaponVariants,
    getItemCountsForWeaponVariants,
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
    clearLegacyGodRolls,

    // Premade wishlist editing
    hasLocalChanges,
    markChangesSaved,
    addItemToPreset,
    removeItemFromPreset,
    updateItemInPreset
  }
})
