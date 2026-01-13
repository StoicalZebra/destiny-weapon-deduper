<template>
  <div class="space-y-6 text-gray-200">
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">

      <!-- Left: Selection Grid -->
      <div class="xl:col-span-2 space-y-4">

        <!-- Saved Profiles List -->
        <div v-if="displayProfiles.length > 0" class="space-y-3">
           <h4 class="font-bold text-sm text-gray-400 uppercase tracking-wider">Saved on Your Custom Wishlist</h4>
           <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                 v-for="profile in displayProfiles"
                 :key="profile.id"
                 class="group bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-lg p-3 transition-colors cursor-pointer relative"
                 :class="{ 'ring-2 ring-blue-500/50 border-blue-500/50 bg-blue-900/10': isProfileActive(profile) }"
                 @click="loadProfile(profile)"
              >
                 <!-- Header row with actions -->
                 <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-1.5">
                       <span class="text-[10px] text-gray-500">
                          {{ profile.item.perkHashes.length }} perks
                       </span>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2" @click.stop>
                       <template v-if="profile.showDeleteConfirm">
                          <span class="text-[10px] text-red-400 font-bold">Sure?</span>
                          <button
                             @click="deleteProfile(profile.id)"
                             class="text-xs px-2 py-0.5 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 rounded"
                          >
                             Yes
                          </button>
                          <button
                             @click="profile.showDeleteConfirm = false"
                             class="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
                          >
                             Cancel
                          </button>
                       </template>
                       <template v-else>
                          <button
                             @click="profile.showDeleteConfirm = true"
                             class="p-1 text-gray-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
                 <p v-if="profile.item.notes" class="text-xs text-gray-400 mt-2 line-clamp-2">
                    {{ profile.item.notes }}
                 </p>
              </div>
           </div>
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-lg">Wishlist Roll Editor</h4>
          
          <div class="flex items-center gap-4">
             <!-- Legend -->
            <div class="flex items-center gap-3 text-xs bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50">
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                <span class="text-gray-300">Required Perk (Click)</span>
              </span>
              <span class="w-px h-3 bg-gray-600"></span>
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                <span class="text-gray-300">Nice to Have / Optional Perk (Shift+Click)</span>
              </span>
            </div>
             <button 
                @click="clearSelection"
                class="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors text-gray-400 hover:text-white"
              >
                Clear Perks
              </button>
          </div>
        </div>

        <div class="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          <!-- Column Headers -->
          <div
             class="grid gap-px bg-gray-800 border-b border-gray-700"
             :style="{ gridTemplateColumns: `repeat(${matrixColumns.length}, minmax(0, 1fr))` }"
          >
            <div
              v-for="col in matrixColumns"
              :key="col.columnIndex"
              class="p-2 text-[10px] uppercase font-bold text-center text-gray-400 tracking-wider truncate"
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
                :class="getPerkRowClasses(perk)"
                @click="toggleSelection(perk.hash, $event)"
              >
                <!-- Content -->
                <div
                  class="relative z-10 flex items-center gap-1.5"
                  :title="perk.description || perk.name"
                >
                  <div class="relative flex-shrink-0 ml-0.5">
                    <!-- Perk icon with ring indicator -->
                    <div
                      class="w-6 h-6 rounded-full overflow-hidden"
                      :class="getPerkIconClasses(perk)"
                    >
                      <img
                        v-if="perk.icon"
                        :src="`https://www.bungie.net${perk.icon}`"
                        class="w-full h-full object-cover"
                      />
                      <div v-else class="w-full h-full bg-gray-700"></div>
                    </div>
                  </div>
                  <span class="text-[10px] font-medium truncate select-none leading-tight" :class="perk.isOwned ? 'text-gray-200' : 'text-gray-500'">{{ perk.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Inline Save / Update Form -->
        <div v-if="hasSelection" class="bg-gray-800/80 rounded-lg border border-gray-700 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
           <div class="space-y-3">
              <div>
                 <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Notes (Optional)
                 </label>
                 <textarea
                    v-model="profileNotesInput"
                    placeholder="Add notes about this roll (e.g., PvP Roll, Best for add clear)..."
                    rows="2"
                    class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-600 resize-none"
                 />
                 <p class="text-xs text-gray-500 mt-1">
                    {{ saveTargetText }}
                 </p>
              </div>

              <div class="flex justify-end items-center gap-3">
                 <p v-if="saveMessage" :class="['text-xs', saveMessage.type === 'error' ? 'text-red-400' : 'text-gray-400']">{{ saveMessage.text }}</p>
                 <button
                    @click="handleCancel"
                    class="px-4 py-2 rounded text-sm font-medium transition-colors bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600"
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
        <h4 class="font-bold text-lg">In Your Inventory ({{ weapon.instances.length }})</h4>
        <div class="grid grid-cols-3 gap-2">
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
                  class="text-[10px] font-bold px-1.5 py-0.5 bg-green-900 text-green-300 rounded uppercase tracking-wide"
                >
                  Match
                </span>
                <span :class="getTierClass(instance.gearTier)" class="text-[10px]">{{ formatTier(instance.gearTier) }}</span>
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
import type { GodRollSelection, PerkColumnInfo } from '@/services/dim-wishlist-parser'
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
  return new Set(Object.keys(selection.value).map(Number))
})

// --- Selection State ---
const selection = ref<GodRollSelection>({}) // Keyed by hash (number)

const hasSelection = computed(() => Object.keys(selection.value).length > 0)

const toggleSelection = (perkHash: number, event: MouseEvent) => {
  const current = selection.value[perkHash]
  
  if (current) {
    if (event.shiftKey) {
        if (current === 'AND') selection.value[perkHash] = 'OR'
        else delete selection.value[perkHash]
    } else {
        delete selection.value[perkHash]
    }
  } else {
    // New selection: Click = AND, Shift+Click = OR
    selection.value[perkHash] = event.shiftKey ? 'OR' : 'AND'
  }
}

const clearSelection = () => {
  selection.value = {}
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

  // Iterate columns and check logic
  // Logic: 
  // For each column that has selections:
  //   - If ANY 'AND' selection exists in this column:
  //       - Instance MUST have ALL of the 'AND' perks in this column?
  //       - Actually, typical God Roll logic is usually per-column.
  //       - Standard: 
  //         - "OR": Match if instance has ANY of the OR perks.
  //         - "AND": Match if instance has THIS specific perk.
  //   - Conflict: If a column has both AND and OR?
  //     - Usually "AND" implies strict requirement. "OR" implies options.
  //     - Valid logic: (Has P1_AND AND Has P2_AND ...) AND (Has P3_OR OR Has P4_OR ...)
  
  // Let's implement robust Logic per column:
  // Column Match = (All ANDs present) && (If ORs exist, at least one OR present)
  // Overall Match = All Columns Match
  
  for (const col of matrixColumns.value) {
    const colPerks = col.availablePerks.map(p => p.hash)
    const selectedInCol = colPerks.filter(h => selection.value[h])
    
    if (selectedInCol.length === 0) continue // No criteria for this column, verify next

    // Check ANDs
    const ands = selectedInCol.filter(h => selection.value[h] === 'AND')
    for (const h of ands) {
       if (!doesInstanceHavePerk(instance, h, col.columnIndex)) return false
    }

    // Check ORs
    const ors = selectedInCol.filter(h => selection.value[h] === 'OR')
    if (ors.length > 0) {
       const hasAnyOr = ors.some(h => doesInstanceHavePerk(instance, h, col.columnIndex))
       if (!hasAnyOr) return false
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
    const currentPerkHashes = new Set(Object.keys(selection.value).map(Number))
    const profilePerkHashes = new Set(profile.item.perkHashes)

    // Different number of perks
    if (currentPerkHashes.size !== profilePerkHashes.size) return false

    // Check if all perks match
    for (const hash of currentPerkHashes) {
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
const getPerkRowClasses = (perk: Perk) => {
  const selectionType = selection.value[perk.hash]

  // Selected states take priority
  if (selectionType === 'OR') {
    return 'bg-blue-900/40 border-blue-500/70 ring-1 ring-blue-500/50'
  }
  if (selectionType === 'AND') {
    return 'bg-orange-900/40 border-orange-500/70 ring-1 ring-orange-500/50'
  }

  // Unowned perks are dimmed
  if (!perk.isOwned) return 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-700/30'

  // Default owned state
  return 'bg-gray-800 border-gray-700 hover:bg-gray-700'
}

// Perk icon ring classes (matches Coverage tab styling + selection state)
const getPerkIconClasses = (perk: Perk) => {
  const selectionType = selection.value[perk.hash]

  // Selected states
  if (selectionType === 'AND') {
    return 'ring-2 ring-orange-400 ring-offset-1 ring-offset-gray-900'
  }
  if (selectionType === 'OR') {
    return 'ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-900'
  }

  // Owned perk (white ring)
  if (perk.isOwned) {
    return 'ring-1 ring-white/80 ring-offset-1 ring-offset-gray-900'
  }

  // Not owned (dimmed with gray ring)
  return 'ring-1 ring-gray-700 opacity-40'
}

const getMatchClasses = (instId: string) => {
  if (!hasSelection.value) return 'bg-gray-800 border-gray-700'
  return isMatch(instId)
    ? 'bg-green-900/20 border-green-500/50 ring-1 ring-green-500/30'
    : 'bg-gray-800 border-gray-700 opacity-50'
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
    return 'text-gray-600'
  }
  return 'text-gray-400'
}

</script>
