<template>
  <div class="space-y-6 text-text">
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">

      <!-- Left: Selection Grid -->
      <div class="xl:col-span-2 space-y-4">

        <!-- Saved Profiles List -->
        <div v-if="displayProfiles.length > 0" class="space-y-3">
           <h4 class="font-bold text-sm text-text-muted uppercase tracking-wider">Saved on Your Custom Wishlist</h4>
           <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                 v-for="profile in displayProfiles"
                 :key="profile.id"
                 class="group bg-surface-elevated border border-border hover:border-border-subtle rounded-lg p-3 transition-colors cursor-pointer relative"
                 :class="{ 'ring-2 ring-blue-500/50 border-blue-500/50 bg-blue-900/10': isProfileActive(profile) }"
                 @click="loadProfile(profile)"
              >
                 <!-- Header row with actions -->
                 <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-1.5">
                       <span class="text-xs text-text-subtle">
                          {{ profile.item.perkHashes.length }} perks
                       </span>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2" @click.stop>
                       <template v-if="profile.showDeleteConfirm">
                          <span class="text-xs text-red-600 dark:text-red-400 font-bold">Sure?</span>
                          <button
                             @click="deleteProfile(profile.id)"
                             class="text-xs px-2 py-0.5 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 rounded"
                          >
                             Yes
                          </button>
                          <button
                             @click="profile.showDeleteConfirm = false"
                             class="text-xs px-2 py-0.5 bg-surface-overlay hover:bg-surface-elevated text-text-muted rounded"
                          >
                             Cancel
                          </button>
                       </template>
                       <template v-else>
                          <button
                             @click="profile.showDeleteConfirm = true"
                             class="p-1 text-text-subtle hover:text-red-600 dark:hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                             title="Delete"
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                             </svg>
                          </button>
                       </template>
                    </div>
                 </div>

                 <!-- DIM-style perk matrix -->
                 <WishlistPerkMatrix
                    :weapon-hash="weapon.weaponHash"
                    :perk-hashes="profile.item.perkHashes"
                 />

                 <!-- Notes (if any) -->
                 <p v-if="profile.item.notes" class="text-xs text-text-muted mt-2 line-clamp-2">
                    {{ profile.item.notes }}
                 </p>
              </div>
           </div>
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-lg text-text">Wishlist Roll Editor</h4>

          <div class="flex items-center gap-4">
             <!-- Legend -->
            <div class="flex items-center gap-3 text-xs bg-surface-elevated/50 px-3 py-1.5 rounded-full border border-border/50">
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                <span class="text-text-muted">Selected Perk</span>
              </span>
            </div>
             <!-- Enhance Toggle Button (only show if weapon has enhanceable perks) -->
             <button
                v-if="hasEnhanceablePerks"
                @click="toggleEnhancedMode"
                class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors"
                :class="enhancedMode
                  ? 'bg-amber-900/50 border-amber-500/70 text-amber-300 hover:bg-amber-900/70'
                  : 'bg-surface-elevated hover:bg-surface-overlay border-border text-text-muted hover:text-text'"
                :title="enhancedMode ? 'Show base perks' : 'Show enhanced perks'"
             >
                <!-- Up arrow icon for enhanced -->
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" :class="enhancedMode ? 'text-amber-400' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span>Enhance</span>
             </button>
             <button
                @click="clearSelection"
                class="text-xs px-3 py-1.5 rounded bg-surface-elevated hover:bg-surface-overlay border border-border transition-colors text-text-muted hover:text-text"
              >
                Clear Perks
              </button>
          </div>
        </div>

        <div class="bg-surface border border-border rounded-lg overflow-hidden">
          <!-- Column Headers -->
          <div
             class="grid gap-px bg-surface-elevated border-b border-border"
             :style="{ gridTemplateColumns: `repeat(${matrixColumns.length}, minmax(0, 1fr))` }"
          >
            <div
              v-for="col in matrixColumns"
              :key="col.columnIndex"
              class="p-2 text-xs uppercase font-bold text-center text-text-muted tracking-wider truncate"
            >
              {{ col.columnName }}
            </div>
          </div>

          <!-- Matrix Content (matches Coverage tab styling) -->
          <div class="flex gap-2 p-2">
            <div
              v-for="column in matrixColumns"
              :key="column.columnIndex"
              class="flex-1 flex flex-col gap-1"
            >
              <div
                v-for="perk in getAvailablePerks(column)"
                :key="perk.hash"
                class="relative px-2 py-1.5 rounded-lg border cursor-pointer group transition-all duration-200"
                :class="getPerkRowClasses(perk, column)"
                @click="toggleSelection(perk, column, $event)"
              >
                <!-- Content -->
                <div
                  class="relative z-10 flex items-center gap-1.5"
                  :title="getPerkTooltip(perk, column)"
                >
                  <div class="relative flex-shrink-0 ml-0.5 w-8 h-8">
                    <!-- Perk icon with ring indicator (uses semantic bg-perk-background) -->
                    <div
                      class="w-8 h-8 rounded-full overflow-hidden bg-perk-background"
                      :class="getPerkIconClasses(perk, column)"
                    >
                      <img
                        v-if="getPerkIcon(perk, column)"
                        :src="`https://www.bungie.net${getPerkIcon(perk, column)}`"
                        class="w-full h-full object-cover"
                      />
                      <div v-else class="w-full h-full bg-surface-overlay"></div>
                    </div>

                    <!-- Enhanced indicator overlay -->
                    <div
                      v-if="isEnhancedDisplay(perk, column)"
                      class="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-sm"
                      title="Enhanced"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7" />
                      </svg>
                    </div>
                  </div>
                  <span
                    class="text-xs font-medium truncate select-none leading-tight"
                    :class="[
                      perk.isOwned ? 'text-text' : 'text-text-subtle',
                      isEnhancedDisplay(perk, column) ? 'text-amber-200' : ''
                    ]"
                  >
                    {{ isEnhancedDisplay(perk, column) ? perk.name.replace(/^Enhanced\s+/i, '') : perk.name }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Inline Save / Update Form -->
        <div v-if="hasSelection" class="bg-surface-elevated/80 rounded-lg border border-border p-4 animate-in fade-in slide-in-from-top-2 duration-200">
           <div class="space-y-3">
              <div>
                 <label class="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                    Notes (Optional)
                 </label>
                 <textarea
                    v-model="profileNotesInput"
                    placeholder="Add notes about this roll (e.g., PvP Roll, Best for add clear)..."
                    rows="2"
                    class="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-text-subtle resize-none"
                 />
                 <p class="text-xs text-text-subtle mt-1">
                    {{ saveTargetText }}
                 </p>
              </div>

              <div class="flex justify-end items-center gap-3">
                 <p v-if="saveMessage" :class="['text-xs', saveMessage.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-text-muted']">{{ saveMessage.text }}</p>
                 <button
                    @click="handleCancel"
                    class="px-4 py-2 rounded text-sm font-medium transition-colors bg-surface-overlay hover:bg-surface-elevated text-text border border-border"
                 >
                    Cancel
                 </button>
                 <button
                    @click="handleSave"
                    class="px-4 py-2 rounded text-sm font-medium transition-colors"
                    :class="buttonClasses"
                 >
                    {{ buttonLabel }}
                 </button>
              </div>
           </div>
        </div>

      </div>

      <!-- Right: Instances List (matches Coverage tab styling) -->
      <div class="space-y-4">
        <h4 class="font-bold text-lg text-text">In Your Inventory ({{ weapon.instances.length }})</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="(instance, index) in weapon.instances"
            :key="instance.itemInstanceId"
            class="p-2 rounded-lg border transition-all duration-200"
            :class="getMatchClasses(instance.itemInstanceId)"
          >
            <div class="flex items-center justify-between mb-1.5 gap-1">
              <span class="font-bold text-xs">Copy {{ index + 1 }}</span>
              <div class="flex items-center gap-1">
                <span
                  v-if="isMatch(instance.itemInstanceId)"
                  class="text-xs font-bold px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded uppercase tracking-wide"
                >
                  Match
                </span>
                <span :class="getTierClass(instance.gearTier)" class="text-xs">{{ formatTier(instance.gearTier) }}</span>
              </div>
            </div>

            <!-- Instance Perk Grid with wishlist annotations -->
            <InstancePerkGrid
              :instance="instance"
              :perk-matrix="weapon.perkMatrix"
              :wishlist-perk-annotations="wishlistPerkAnnotations"
              :highlighted-perks="highlightedPerks"
            />
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { DedupedWeapon, PerkColumn } from '@/models/deduped-weapon'
import type { WeaponInstance } from '@/models/weapon-instance'
import type { Perk } from '@/models/perk'
import type { WishlistItem, Wishlist } from '@/models/wishlist'
import { useWishlistsStore } from '@/stores/wishlists'
import type { PerkColumnInfo } from '@/services/dim-wishlist-parser'
import { getWishlistPerkAnnotations, selectionToWishlistItem } from '@/services/dim-wishlist-parser'
import InstancePerkGrid from './InstancePerkGrid.vue'
import WishlistPerkMatrix from '@/components/wishlists/WishlistPerkMatrix.vue'

const props = defineProps<{
  weapon: DedupedWeapon
}>()

// Initialize wishlists store and router
const wishlistsStore = useWishlistsStore()
const router = useRouter()

const matrixColumns = computed(() => props.weapon.perkMatrix)

// Convert perkMatrix to PerkColumnInfo format for store helpers
const perkColumnsForStore = computed<PerkColumnInfo[]>(() => {
  return matrixColumns.value.map(col => ({
    columnIndex: col.columnIndex,
    columnName: col.columnName,
    availablePerks: col.availablePerks.map(p => ({ hash: p.hash, name: p.name }))
  }))
})

// Get wishlist perk annotations for this weapon (for InstancePerkGrid)
const wishlistPerkAnnotations = computed(() => {
  const wishlistResults = wishlistsStore.getItemsForWeaponHash(props.weapon.weaponHash)
  return getWishlistPerkAnnotations(wishlistResults)
})

// Get currently highlighted perks from selection (for InstancePerkGrid)
const highlightedPerks = computed(() => {
  return new Set(selection.value)
})

// --- Enhanced Mode State ---
const enhancedMode = ref(false)

// Build a lookup map for perks (hash -> Perk) for efficient mode conversion
const perkLookup = computed(() => {
  const map = new Map<number, Perk>()
  for (const col of matrixColumns.value) {
    for (const perk of col.availablePerks) {
      // Map the primary hash
      map.set(perk.hash, perk)
      // Also map variant hashes to the same perk
      if (perk.variantHashes) {
        for (const variantHash of perk.variantHashes) {
          map.set(variantHash, perk)
        }
      }
    }
  }
  return map
})

// Check if any perks in trait columns have enhanced variants
const hasEnhanceablePerks = computed(() => {
  for (const col of matrixColumns.value) {
    // Only trait columns have enhanced variants
    if (col.columnName === 'Left Trait' || col.columnName === 'Right Trait') {
      if (col.availablePerks.some(p => p.hasEnhancedVariant)) {
        return true
      }
    }
  }
  return false
})

// Check if a column is a trait column (only trait columns support enhanced perks)
const isTraitColumn = (columnName: string): boolean => {
  return columnName === 'Left Trait' || columnName === 'Right Trait'
}

// Check if a perk should display as enhanced
const isEnhancedDisplay = (perk: Perk, column: PerkColumn): boolean => {
  return enhancedMode.value && isTraitColumn(column.columnName) && !!perk.hasEnhancedVariant
}

// Get the appropriate icon for a perk (enhanced or base depending on mode)
const getPerkIcon = (perk: Perk, column: PerkColumn): string => {
  if (isEnhancedDisplay(perk, column) && perk.enhancedIcon) {
    return perk.enhancedIcon
  }
  return perk.icon
}

// Get the appropriate tooltip for a perk (enhanced or base depending on mode)
const getPerkTooltip = (perk: Perk, column: PerkColumn): string => {
  if (isEnhancedDisplay(perk, column) && perk.enhancedDescription) {
    return perk.enhancedDescription
  }
  return perk.description || perk.name
}

// Toggle enhanced mode
const toggleEnhancedMode = () => {
  const newMode = !enhancedMode.value

  // Convert existing selection to new mode
  if (selection.value.size > 0) {
    const newSelection = new Set<number>()

    for (const hash of selection.value) {
      const perk = perkLookup.value.get(hash)

      if (perk && perk.hasEnhancedVariant) {
        // Map to enhanced or base hash based on new mode
        const targetHash = newMode
          ? (perk.enhancedHash ?? hash)
          : (perk.baseHash ?? hash)
        newSelection.add(targetHash)
      } else {
        // Keep unknown or non-enhanceable hashes as-is
        newSelection.add(hash)
      }
    }

    selection.value = newSelection
  }

  enhancedMode.value = newMode
}

// Check if a perk is selected (checks both base and enhanced hashes)
const isPerkSelected = (perk: Perk): boolean => {
  // Check primary hash
  if (selection.value.has(perk.hash)) {
    return true
  }
  // Check variant hashes
  if (perk.variantHashes) {
    for (const variantHash of perk.variantHashes) {
      if (selection.value.has(variantHash)) {
        return true
      }
    }
  }
  return false
}

// --- Selection State ---
const selection = ref<Set<number>>(new Set())

const hasSelection = computed(() => selection.value.size > 0)

const toggleSelection = (perk: Perk, column: PerkColumn, _event: MouseEvent) => {
  // Determine which hash to use based on enhanced mode and column type
  const useEnhanced = enhancedMode.value &&
                      isTraitColumn(column.columnName) &&
                      perk.hasEnhancedVariant

  const perkHash = useEnhanced
    ? (perk.enhancedHash ?? perk.hash)
    : (perk.baseHash ?? perk.hash)

  // Check if there's already a selection for this perk (using either variant)
  const isSelected = isPerkSelected(perk)

  if (isSelected) {
    // Find which hash is currently selected and remove it
    const currentHash = perk.variantHashes?.find(h => selection.value.has(h)) ?? perk.hash
    selection.value.delete(currentHash)
    // Trigger reactivity by creating a new Set
    selection.value = new Set(selection.value)
  } else {
    // Add to selection
    selection.value.add(perkHash)
    // Trigger reactivity by creating a new Set
    selection.value = new Set(selection.value)
  }
}

const clearSelection = () => {
  selection.value = new Set()
  currentProfileId.value = null
  sourceWishlistId.value = null
  profileNotesInput.value = ''
  saveMessage.value = null
}

const handleCancel = () => {
  // If editing from a wishlist, navigate back to it
  if (sourceWishlistId.value) {
    router.push({ name: 'wishlist-detail', params: { id: sourceWishlistId.value } })
  } else {
    // Just clear the selection
    clearSelection()
  }
}

// --- Matching Logic ---

const doesInstanceHavePerk = (instance: WeaponInstance, perkHash: number, colIndex: number): boolean => {
  // Check active plug
  if (instance.sockets.sockets[colIndex]?.plugHash === perkHash) return true
  
  // Check reusable plugs (selectable options)
  const reusables = instance.socketPlugsByIndex?.[colIndex]
  if (reusables && reusables.includes(perkHash)) return true

  return false
}

const isMatch = (instId: string) => {
  if (!hasSelection.value) return false

  const instance = props.weapon.instances.find(i => i.itemInstanceId === instId)
  if (!instance) return false

  // For each column that has selections, instance must have ALL selected perks
  for (const col of matrixColumns.value) {
    const colPerks = col.availablePerks.map(p => p.hash)
    const selectedInCol = colPerks.filter(h => selection.value.has(h))

    if (selectedInCol.length === 0) continue // No criteria for this column

    // Instance must have ALL selected perks in this column
    for (const h of selectedInCol) {
      if (!doesInstanceHavePerk(instance, h, col.columnIndex)) return false
    }
  }

  return true
}

// --- Persistence (using Wishlists Store) ---

// UI display wrapper that adds showDeleteConfirm state
interface DisplayProfile {
  id: string
  item: WishlistItem
  showDeleteConfirm?: boolean
}

const displayProfiles = ref<DisplayProfile[]>([])
const currentProfileId = ref<string | null>(null)
const sourceWishlistId = ref<string | null>(null) // Track which wishlist we're editing from
const profileNotesInput = ref('')
const saveMessage = ref<{ text: string; type: 'error' | 'info' } | null>(null)

// Load wishlist items for this weapon from the store
const loadProfilesFromStore = async () => {
    // Ensure store is initialized
    if (!wishlistsStore.initialized) {
        await wishlistsStore.initialize(false) // Don't check updates during load
    }

    // Get user wishlist items for this weapon
    const items = wishlistsStore.getUserItemsForWeapon(props.weapon.weaponHash)

    displayProfiles.value = items.map(item => ({
        id: item.id,
        item,
        showDeleteConfirm: false
    }))
}

const handleSave = async () => {
    const trimmedNotes = profileNotesInput.value.trim()

    // Must have at least one perk selected
    if (!hasSelection.value) {
        saveMessage.value = { text: 'Select at least one perk before saving', type: 'error' }
        return
    }

    saveMessage.value = null

    // Convert selection to perk hashes using the helper that creates a full item
    const tempItem = selectionToWishlistItem(
        selection.value,
        props.weapon.weaponHash,
        perkColumnsForStore.value
    )
    const perkHashes = tempItem.perkHashes

    // If updating an existing item, check if anything actually changed
    if (currentProfileId.value) {
        const existingProfile = displayProfiles.value.find(p => p.id === currentProfileId.value)
        if (existingProfile) {
            const existingPerks = new Set(existingProfile.item.perkHashes)
            const newPerks = new Set(perkHashes)
            const perksMatch = existingPerks.size === newPerks.size &&
                [...existingPerks].every(h => newPerks.has(h))
            const notesMatch = (existingProfile.item.notes || '') === trimmedNotes

            if (perksMatch && notesMatch) {
                // No changes - show message instead of saving
                saveMessage.value = { text: 'No changes detected', type: 'info' }
                return
            }
        }
    }

    let savedItem: WishlistItem

    // If editing from a specific wishlist, update there instead of "My God Rolls"
    if (sourceWishlistId.value && currentProfileId.value) {
        const wishlist = wishlistsStore.getWishlistById(sourceWishlistId.value)

        if (wishlist?.sourceType === 'preset') {
            // Admin mode - update preset wishlist
            await wishlistsStore.updateItemInPreset(
                sourceWishlistId.value,
                currentProfileId.value,
                {
                    perkHashes,
                    notes: trimmedNotes || undefined
                }
            )
        } else {
            // Regular user wishlist
            wishlistsStore.updateItemInWishlist(
                sourceWishlistId.value,
                currentProfileId.value,
                {
                    perkHashes,
                    notes: trimmedNotes || undefined
                }
            )
        }

        // Build the updated item for local state
        savedItem = {
            id: currentProfileId.value,
            weaponHash: props.weapon.weaponHash,
            perkHashes,
            notes: trimmedNotes || undefined
        }

        // Update local display state
        const idx = displayProfiles.value.findIndex(p => p.id === currentProfileId.value)
        if (idx !== -1) {
            displayProfiles.value[idx].item = savedItem
        }
    } else {
        // Save to default "My God Rolls" wishlist (existing behavior)
        savedItem = wishlistsStore.saveGodRollSelection(
            selection.value,
            props.weapon.weaponHash,
            perkColumnsForStore.value,
            {
                notes: trimmedNotes || undefined,
                existingItemId: currentProfileId.value || undefined
            }
        )

        // Update local display state
        if (currentProfileId.value) {
            // Update existing
            const idx = displayProfiles.value.findIndex(p => p.id === currentProfileId.value)
            if (idx !== -1) {
                displayProfiles.value[idx].item = savedItem
            }
        } else {
            // Add new
            displayProfiles.value.push({
                id: savedItem.id,
                item: savedItem,
                showDeleteConfirm: false
            })
            currentProfileId.value = savedItem.id
        }
    }
}

const loadProfile = (profile: DisplayProfile) => {
    // Convert WishlistItem back to selection format
    selection.value = wishlistsStore.loadWishlistItemAsSelection(
        profile.item,
        perkColumnsForStore.value
    )
    currentProfileId.value = profile.id
    profileNotesInput.value = profile.item.notes || ''

    // Auto-detect enhanced mode based on loaded hashes
    const hasEnhancedHashes = profile.item.perkHashes.some(hash => {
        const perk = perkLookup.value.get(hash)
        return perk?.isEnhanced === true
    })
    enhancedMode.value = hasEnhancedHashes
}

const deleteProfile = (id: string) => {
    wishlistsStore.deleteGodRoll(id)
    displayProfiles.value = displayProfiles.value.filter(p => p.id !== id)
    if (currentProfileId.value === id) {
        clearSelection()
    }
}

// Clear message when user types
watch(profileNotesInput, () => {
    if (saveMessage.value) saveMessage.value = null
})

// Check if a profile's perks match the current selection
const isProfileActive = (profile: DisplayProfile): boolean => {
    const profilePerkHashes = new Set(profile.item.perkHashes)

    // Different number of perks
    if (selection.value.size !== profilePerkHashes.size) return false

    // Check if all perks match
    for (const hash of selection.value) {
        if (!profilePerkHashes.has(hash)) return false
    }

    return true
}

// Button state computed properties (simplified - no names in DIM format)
const buttonLabel = computed(() => {
    if (!currentProfileId.value) return 'Save to Wishlist'
    return 'Update Roll'
})

// Dynamic save target text
const saveTargetText = computed(() => {
    if (sourceWishlistId.value) {
        const wishlist = wishlistsStore.getWishlistById(sourceWishlistId.value)
        if (wishlist) {
            return `Saves to "${wishlist.name}" wishlist`
        }
    }
    return 'Saves to your personal wishlist in DIM-compatible format'
})

const buttonClasses = computed(() => {
    if (!currentProfileId.value) {
        return 'bg-green-700 hover:bg-green-600 text-white border border-green-600'
    }
    // Update mode - orange/amber color
    return 'bg-orange-600 hover:bg-orange-500 text-white border border-orange-500'
})

// Load on mount/weapon change
onMounted(loadProfilesFromStore)
watch(() => props.weapon.weaponHash, () => {
    loadProfilesFromStore()
    clearSelection()
})

// --- Public Methods (exposed for parent components) ---

// Load a wishlist item into the Creator (preview only, doesn't save)
const loadWishlistItem = (item: WishlistItem) => {
    selection.value = wishlistsStore.loadWishlistItemAsSelection(
        item,
        perkColumnsForStore.value
    )
    currentProfileId.value = null
    profileNotesInput.value = item.notes || ''

    // Auto-detect enhanced mode based on loaded hashes
    const hasEnhancedHashes = item.perkHashes.some(hash => {
        const perk = perkLookup.value.get(hash)
        return perk?.isEnhanced === true
    })
    enhancedMode.value = hasEnhancedHashes
}

// Edit an existing wishlist item in the Creator
const editWishlistItem = (item: WishlistItem, wishlist: Wishlist) => {
    selection.value = wishlistsStore.loadWishlistItemAsSelection(
        item,
        perkColumnsForStore.value
    )
    // Link to the existing item for update mode
    currentProfileId.value = item.id
    // Track which wishlist we're editing from (for save-back)
    sourceWishlistId.value = wishlist.id
    profileNotesInput.value = item.notes || ''

    // Make sure this item is in our display profiles
    if (!displayProfiles.value.find(p => p.id === item.id)) {
        displayProfiles.value.push({
            id: item.id,
            item,
            showDeleteConfirm: false
        })
    }

    // Auto-detect enhanced mode based on loaded hashes
    const hasEnhancedHashes = item.perkHashes.some(hash => {
        const perk = perkLookup.value.get(hash)
        return perk?.isEnhanced === true
    })
    enhancedMode.value = hasEnhancedHashes
}

// Expose methods for parent component access
defineExpose({
    loadWishlistItem,
    editWishlistItem
})

// --- Styles ---

// Filter out retired perks that can no longer roll on current weapon versions
const getAvailablePerks = (column: PerkColumn) => {
  return column.availablePerks.filter(perk => !perk.cannotCurrentlyRoll)
}

// Row background and border classes (matches Coverage tab styling + selection state)
const getPerkRowClasses = (perk: Perk, column: PerkColumn) => {
  const isSelected = isPerkSelected(perk)
  const enhanced = isEnhancedDisplay(perk, column)

  // Enhanced + selected state
  if (enhanced && isSelected) {
    return 'bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-amber-500/70 ring-1 ring-amber-500/50'
  }

  // Enhanced but not selected - subtle gold tint
  if (enhanced) {
    if (!perk.isOwned) return 'bg-amber-900/20 border-amber-600/30 hover:bg-amber-900/30 opacity-60'
    return 'bg-amber-900/20 border-amber-600/40 hover:bg-amber-900/30'
  }

  // Non-enhanced selected state
  if (isSelected) {
    return 'bg-orange-900/40 border-orange-500/70 ring-1 ring-orange-500/50'
  }

  // Unowned perks are dimmed
  if (!perk.isOwned) return 'bg-surface-elevated/30 border-border/50 hover:bg-surface-overlay/30'

  // Default owned state
  return 'bg-surface-elevated border-border hover:bg-surface-overlay'
}

// Perk icon ring classes (matches Coverage tab styling + selection state)
const getPerkIconClasses = (perk: Perk, column: PerkColumn) => {
  const isSelected = isPerkSelected(perk)
  const enhanced = isEnhancedDisplay(perk, column)

  if (enhanced) {
    // Gold ring for enhanced perks
    if (isSelected) {
      return 'ring-2 ring-amber-400 ring-offset-1 ring-offset-surface'
    }
    // Enhanced but not selected
    if (perk.isOwned) {
      return 'ring-2 ring-amber-500/50 ring-offset-1 ring-offset-surface'
    }
    return 'ring-1 ring-amber-600/40 opacity-40'
  }

  // Non-enhanced selected state
  if (isSelected) {
    return 'ring-2 ring-orange-400 ring-offset-1 ring-offset-surface'
  }

  // Owned perk (white ring)
  if (perk.isOwned) {
    return 'ring-1 ring-white/80 ring-offset-1 ring-offset-surface'
  }

  // Not owned (dimmed with gray ring)
  return 'ring-1 ring-border opacity-40'
}

const getMatchClasses = (instId: string) => {
  if (!hasSelection.value) return 'bg-surface-elevated border-border'
  return isMatch(instId)
    ? 'bg-green-900/20 border-green-500/50 ring-1 ring-green-500/30'
    : 'bg-surface-elevated border-border opacity-50'
}

// Tier display helpers (matching Coverage tab)
function formatTier(tier: number | null | undefined): string {
  if (!tier) {
    return 'No Tier'
  }
  const stars = '★'.repeat(tier)
  return `Tier ${tier} ${stars}`
}

function getTierClass(tier: number | null | undefined): string {
  if (!tier) {
    return 'text-text-subtle'
  }
  return 'text-text-muted'
}

</script>
