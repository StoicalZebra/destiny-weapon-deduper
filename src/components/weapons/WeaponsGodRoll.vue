<template>
  <div class="space-y-6 text-gray-200">
    <!-- Community Picks Section -->
    <CommunityPicks
      :weapon="weapon"
      :currentSelection="selection"
      :savedProfileNames="savedProfileNamesSet"
      @save-to-my-rolls="handleSaveCommunityPick"
      @load-pick="handleLoadCommunityPick"
    />

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">

      <!-- Left: Selection Grid -->
      <div class="xl:col-span-2 space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-lg">God Roll Creator</h4>
          
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

        <div class="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden relative">
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

          <!-- Matrix Content -->
          <div class="flex">
            <div 
              v-for="column in matrixColumns" 
              :key="column.columnIndex"
              class="flex-1 border-r border-gray-800 last:border-r-0"
            >
              <div 
                v-for="perk in column.availablePerks" 
                :key="perk.hash"
                class="relative h-10 border-b border-gray-800 last:border-b-0 cursor-pointer group select-none"
                :class="getSelectionClasses(perk.hash)"
                @click="toggleSelection(perk.hash, $event)"
              >
                 <!-- Owned Indicator (Subtle stripe or dot) -->
                 <div v-if="perk.isOwned" class="absolute left-0 top-0 bottom-0 w-0.5 bg-green-500/30"></div>

                <!-- Content -->
                <div
                  class="relative z-10 flex items-center h-full px-2 gap-1.5 overflow-hidden"
                  :title="perk.description || perk.name"
                >
                   <img
                    v-if="perk.icon"
                    :src="`https://www.bungie.net${perk.icon}`"
                    class="w-5 h-5 rounded flex-shrink-0"
                  />
                  <div v-else class="w-5 h-5 rounded bg-gray-700 flex-shrink-0"></div>
                  <span class="text-[10px] font-medium truncate leading-tight">{{ perk.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Inline Save / Update Form -->
        <div v-if="hasSelection" class="bg-gray-800/80 rounded-lg border border-gray-700 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
           <div class="space-y-3">
              <div>
                 <label class="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    God Roll Name
                    <!-- Lock icon for community picks -->
                    <svg v-if="isCurrentProfileLocked" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" title="Community Pick - name locked">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <!-- Help tooltip (hide when locked) -->
                    <span v-if="!isCurrentProfileLocked" class="relative group/tooltip cursor-help">
                       <span class="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gray-600 text-[9px] font-bold text-gray-300 hover:bg-gray-500 transition-colors">?</span>
                       <span class="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block z-50 w-56 p-2 text-xs font-normal normal-case tracking-normal bg-gray-900 border border-gray-600 rounded-lg shadow-xl text-gray-200">
                          <span class="font-semibold text-gray-100 block mb-1">Saving Logic:</span>
                          <span class="block text-gray-300">Same name → Updates existing</span>
                          <span class="block text-gray-300">Different name → Saves as new</span>
                          <!-- Arrow -->
                          <span class="absolute left-3 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-600"></span>
                       </span>
                    </span>
                 </label>
                 <div class="relative">
                    <input
                       v-model="profileNameInput"
                       type="text"
                       placeholder="e.g. PvP God Roll"
                       :readonly="isCurrentProfileLocked"
                       class="w-full bg-gray-900 border rounded px-3 py-2 text-sm text-white focus:outline-none placeholder-gray-600"
                       :class="[
                          saveError ? 'border-red-500' : 'border-gray-600',
                          isCurrentProfileLocked ? 'cursor-not-allowed opacity-75' : 'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                       ]"
                       @keyup.enter="handleSave"
                    />
                 </div>
                 <p v-if="saveError" class="text-xs text-red-400 mt-1">{{ saveError }}</p>
                 <p v-if="isCurrentProfileLocked" class="text-xs text-purple-400 mt-1">Community Pick - change perks to save as your own roll</p>
              </div>

              <div>
                 <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Notes
                 </label>
                 <textarea
                    v-model="profileNotesInput"
                    placeholder="Optional notes about this God Roll..."
                    rows="3"
                    class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-600 resize-none"
                 />
              </div>

              <div class="flex justify-end">
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
        
        <!-- Saved Profiles List -->
        <div v-if="savedProfiles.length > 0" class="space-y-3 pt-4 border-t border-gray-700/50">
           <h4 class="font-bold text-sm text-gray-400 uppercase tracking-wider">Saved God Rolls</h4>
           <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                 v-for="profile in savedProfiles"
                 :key="profile.id"
                 class="group bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-lg p-3 transition-colors cursor-pointer relative"
                 :class="{ 'ring-2 ring-blue-500/50 border-blue-500/50 bg-blue-900/10': isProfileActive(profile) }"
                 @click="loadProfile(profile)"
              >
                 <div class="flex justify-between items-start">
                    <div class="min-w-0">
                       <h5 class="font-bold text-sm text-gray-200 truncate flex items-center gap-1.5">
                          <svg v-if="profile.isFromCommunityPick" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" title="Community Pick">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span class="truncate">{{ profile.name }}</span>
                       </h5>
                       <p class="text-[10px] text-gray-500 mt-1 truncate">
                          {{ Object.keys(profile.selection).length }} perks selected
                       </p>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2 ml-2" @click.stop>
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
                             title="Delete Profile"
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                             </svg>
                          </button>
                       </template>
                    </div>
                 </div>
              </div>
           </div>
        </div>

      </div>

      <!-- Right: Matches List -->
      <div class="space-y-4">
        <h4 class="font-bold text-lg">Your Owned Rolls</h4>
        <div class="space-y-2">
          <div 
            v-for="(instance, index) in weapon.instances" 
            :key="instance.itemInstanceId"
            class="p-3 rounded-lg border transition-all duration-200"
            :class="getMatchClasses(instance.itemInstanceId)"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-sm">Roll {{ index + 1 }}</span>
              <span 
                v-if="isMatch(instance.itemInstanceId)"
                class="text-[10px] font-bold px-1.5 py-0.5 bg-green-900 text-green-300 rounded uppercase tracking-wide"
              >
                Match
              </span>
            </div>
            
             <!-- Full Perk Matrix Tags for Instance -->
            <div class="flex flex-wrap gap-1 min-w-0">
               <template v-for="col in matrixColumns" :key="col.columnIndex">
                  <span 
                    v-for="perkHash in getPerksForInstanceInColumn(instance, col.columnIndex)" 
                    :key="perkHash"
                    class="text-[9px] px-1 py-0.5 rounded truncate text-center transition-colors"
                    :class="getPerkTagClass(perkHash)"
                    :title="getPerkName(perkHash)"
                  >
                    {{ getPerkName(perkHash) }}
                  </span>
               </template>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { DedupedWeapon } from '@/models/deduped-weapon'
import type { WeaponInstance } from '@/models/weapon-instance'
import type { CommunityPick } from '@/models/community-pick'
import { manifestService } from '@/services/manifest-service'
import CommunityPicks from './CommunityPicks.vue'

const props = defineProps<{
  weapon: DedupedWeapon
}>()

const matrixColumns = computed(() => props.weapon.perkMatrix)

// --- Selection State ---
type SelectionType = 'OR' | 'AND'
const selection = ref<Record<number, SelectionType>>({}) // Keyed by hash (number)

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
  profileNameInput.value = ''
  profileNotesInput.value = ''
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

// --- Persistence ---

interface SavedProfile {
  id: string
  name: string
  notes?: string
  selection: Record<number, SelectionType>
  isFromCommunityPick?: boolean // Locked - name can't be changed
  showDeleteConfirm?: boolean // UI state
}

const savedProfiles = ref<SavedProfile[]>([])
const currentProfileId = ref<string | null>(null)
const profileNameInput = ref('')
const profileNotesInput = ref('')
const saveError = ref<string | null>(null)

const STORAGE_KEY = computed(() => `d3_godroll_${props.weapon.weaponHash}`)

const loadProfilesFromStorage = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY.value)
        if (raw) savedProfiles.value = JSON.parse(raw)
    } catch (e) {
        console.error("Failed to load profiles", e)
    }
}

const saveProfilesToStorage = () => {
    localStorage.setItem(STORAGE_KEY.value, JSON.stringify(savedProfiles.value))
}

const handleSave = () => {
    const trimmedName = profileNameInput.value.trim()

    // Validate name not empty
    if (!trimmedName) {
        saveError.value = 'Name your God Roll before saving'
        return
    }

    // Determine if this is an update (same name) or create new (different name)
    const loadedProfile = currentProfileId.value
        ? savedProfiles.value.find(p => p.id === currentProfileId.value)
        : null

    const isUpdate = loadedProfile && trimmedName.toLowerCase() === loadedProfile.name.toLowerCase()

    // Check name uniqueness (excluding current profile if updating)
    const excludeId = isUpdate ? currentProfileId.value ?? undefined : undefined

    if (!isNameUnique(trimmedName, excludeId)) {
        saveError.value = 'A God Roll with this name already exists'
        return
    }

    saveError.value = null

    if (isUpdate) {
        // UPDATE MODE: Name matches loaded profile - overwrite it
        const idx = savedProfiles.value.findIndex(p => p.id === currentProfileId.value)
        if (idx !== -1) {
            savedProfiles.value[idx].selection = { ...selection.value }
            savedProfiles.value[idx].name = trimmedName
            savedProfiles.value[idx].notes = profileNotesInput.value.trim() || undefined
        }
    } else {
        // CREATE MODE: Fresh state OR name changed - create new profile
        const newId = crypto.randomUUID()
        savedProfiles.value.push({
            id: newId,
            name: trimmedName,
            notes: profileNotesInput.value.trim() || undefined,
            selection: { ...selection.value }
        })
        currentProfileId.value = newId
    }

    saveProfilesToStorage()
}

const loadProfile = (profile: SavedProfile) => {
    selection.value = { ...profile.selection }
    currentProfileId.value = profile.id
    profileNameInput.value = profile.name
    profileNotesInput.value = profile.notes || ''
}

const deleteProfile = (id: string) => {
    savedProfiles.value = savedProfiles.value.filter(p => p.id !== id)
    saveProfilesToStorage()
    if (currentProfileId.value === id) {
        clearSelection()
    }
}

// Clear error when user types
watch(profileNameInput, () => {
    if (saveError.value) saveError.value = null
})

// When selection changes on a locked community pick, unlock it for "Save as New"
watch(selection, (newSelection) => {
    if (!isCurrentProfileLocked.value) return

    const profile = savedProfiles.value.find(p => p.id === currentProfileId.value)
    if (!profile) return

    // Check if selection differs from the saved profile
    const currentKeys = Object.keys(newSelection)
    const profileKeys = Object.keys(profile.selection)

    let isDifferent = currentKeys.length !== profileKeys.length
    if (!isDifferent) {
        for (const key of currentKeys) {
            const perkHash = Number(key)
            if (newSelection[perkHash] !== profile.selection[perkHash]) {
                isDifferent = true
                break
            }
        }
    }

    if (isDifferent) {
        // Unlock: clear the profile reference and name so user must "Save as New"
        currentProfileId.value = null
        profileNameInput.value = ''
        profileNotesInput.value = ''
    }
}, { deep: true })

// Check if a profile's selection exactly matches the current selection
const isProfileActive = (profile: SavedProfile): boolean => {
    const currentKeys = Object.keys(selection.value)
    const profileKeys = Object.keys(profile.selection)

    // Different number of selections
    if (currentKeys.length !== profileKeys.length) return false

    // Check if all keys and values match
    for (const key of currentKeys) {
        const perkHash = Number(key)
        if (selection.value[perkHash] !== profile.selection[perkHash]) {
            return false
        }
    }

    return true
}

// Check if a name is unique (excluding a specific profile ID)
const isNameUnique = (name: string, excludeId?: string): boolean => {
    return !savedProfiles.value.some(p =>
        p.name.toLowerCase() === name.toLowerCase() &&
        p.id !== excludeId
    )
}

// Set of saved profile names (lowercase) for CommunityPicks to check duplicates
const savedProfileNamesSet = computed(() => {
    return new Set(savedProfiles.value.map(p => p.name.toLowerCase()))
})

// Check if current profile is a locked community pick
const isCurrentProfileLocked = computed(() => {
    if (!currentProfileId.value) return false
    const profile = savedProfiles.value.find(p => p.id === currentProfileId.value)
    return profile?.isFromCommunityPick === true
})

// Button state computed properties
const buttonLabel = computed(() => {
    if (!currentProfileId.value) return 'Save God Roll'

    // Check if name matches the loaded profile's name
    const loadedProfile = savedProfiles.value.find(p => p.id === currentProfileId.value)
    if (loadedProfile && profileNameInput.value.trim().toLowerCase() === loadedProfile.name.toLowerCase()) {
        return 'Update God Roll'
    }

    return 'Save as New God Roll'
})

const buttonClasses = computed(() => {
    if (!currentProfileId.value) {
        return 'bg-green-700 hover:bg-green-600 text-white border border-green-600'
    }

    // Check if name matches the loaded profile's name
    const loadedProfile = savedProfiles.value.find(p => p.id === currentProfileId.value)
    if (loadedProfile && profileNameInput.value.trim().toLowerCase() === loadedProfile.name.toLowerCase()) {
        // Update mode - orange/amber color
        return 'bg-orange-600 hover:bg-orange-500 text-white border border-orange-500'
    }

    // Save as new mode - green color
    return 'bg-green-700 hover:bg-green-600 text-white border border-green-600'
})

// Load on mount/weapon change
onMounted(loadProfilesFromStorage)
watch(() => props.weapon.weaponHash, () => {
    loadProfilesFromStorage()
    clearSelection()
})

// --- Community Picks Integration ---
const handleSaveCommunityPick = (pick: CommunityPick) => {
    // Check for existing profile with same name
    const existingIdx = savedProfiles.value.findIndex(
        p => p.name.toLowerCase() === pick.name.toLowerCase()
    )

    const newProfile: SavedProfile = {
        id: existingIdx >= 0 ? savedProfiles.value[existingIdx].id : crypto.randomUUID(),
        name: pick.name,
        notes: pick.notes,
        selection: { ...pick.selection },
        isFromCommunityPick: true // Mark as locked community pick
    }

    if (existingIdx >= 0) {
        // Update existing
        savedProfiles.value[existingIdx] = newProfile
    } else {
        // Add new
        savedProfiles.value.push(newProfile)
    }

    saveProfilesToStorage()

    // Load into current selection so user sees the pick applied
    selection.value = { ...pick.selection }
    currentProfileId.value = newProfile.id
    profileNameInput.value = newProfile.name
    profileNotesInput.value = newProfile.notes || ''
}

// Load a community pick into the God Roll Creator (preview only, doesn't save)
const handleLoadCommunityPick = (pick: CommunityPick) => {
    // Check if this pick is already saved - if so, load that saved profile
    const existingProfile = savedProfiles.value.find(
        p => p.name.toLowerCase() === pick.name.toLowerCase()
    )

    if (existingProfile) {
        // Load the saved profile (maintains locked state)
        loadProfile(existingProfile)
    } else {
        // Just load the selection for preview (no profile association)
        selection.value = { ...pick.selection }
        currentProfileId.value = null
        profileNameInput.value = ''
        profileNotesInput.value = ''
    }
}

// --- Helpers ---

const getPerksForInstanceInColumn = (instance: WeaponInstance, colIndex: number): number[] => {
   const perks = new Set<number>()
   const active = instance.sockets.sockets[colIndex]?.plugHash
   if (active) perks.add(active)
   const reusables = instance.socketPlugsByIndex?.[colIndex]
   if (reusables) reusables.forEach(p => perks.add(p))
   return Array.from(perks)
}

const perkNameCache = new Map<number, string>()
const getPerkName = (hash: number) => {
  if (perkNameCache.has(hash)) return perkNameCache.get(hash)

  // Search in matrix first
  for (const col of props.weapon.perkMatrix) {
    const p = col.availablePerks.find(p => p.hash === hash)
    if (p) {
        perkNameCache.set(hash, p.name)
        return p.name
    }
  }

  // Fallback to manifest lookup for perks not in matrix
  const perkDef = manifestService.getInventoryItem(hash)
  if (perkDef?.displayProperties?.name) {
    perkNameCache.set(hash, perkDef.displayProperties.name)
    return perkDef.displayProperties.name
  }

  return 'Unknown'
}

// --- Styles ---

const getSelectionClasses = (perkHash: number) => {
  const type = selection.value[perkHash]
  if (type === 'OR') return 'bg-blue-600/30 border-blue-500/50'
  if (type === 'AND') return 'bg-orange-600/30 border-orange-500/50'
  return 'bg-gray-800 hover:bg-gray-700'
}

const getMatchClasses = (instId: string) => {
  if (!hasSelection.value) return 'bg-gray-800 border-gray-700'
  return isMatch(instId) 
    ? 'bg-green-900/20 border-green-500/50 ring-1 ring-green-500/30' 
    : 'bg-gray-800 border-gray-700 opacity-50'
}

const getPerkTagClass = (perkHash: number) => {
    const type = selection.value[perkHash]
    if (type === 'OR') return 'bg-blue-900/50 text-blue-200 border border-blue-500/30'
    if (type === 'AND') return 'bg-orange-900/50 text-orange-200 border border-orange-500/30'
    return 'bg-black/20 text-gray-400'
}

</script>
