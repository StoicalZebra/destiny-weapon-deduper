<template>
  <div class="space-y-8 text-gray-200">
    <!-- Header Controls -->
    <div class="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
      <div class="space-y-1">
        <h3 class="text-xl font-bold text-white">God Roll Builder Prototype</h3>
        <p class="text-sm text-gray-400">Define your target, see what matches.</p>
      </div>
      
      <!-- Save Logic UI -->
      <div class="flex items-center gap-4">
        <!-- Legend -->
         <div class="hidden xl:block text-xs text-gray-500 bg-gray-900 px-3 py-1.5 rounded border border-gray-700">
          <span class="text-blue-400 font-bold">Click</span> = Acceptable (OR) <span class="mx-2">|</span> 
          <span class="text-orange-400 font-bold">Shift+Click</span> = Required (AND)
        </div>

        <!-- inline Save Form -->
        <div v-if="isSaving" class="flex items-center gap-2 bg-gray-900 p-1 rounded border border-blue-500/50 animate-in fade-in slide-in-from-right-4 duration-200">
          <input 
            v-model="newProfileName"
            type="text" 
            placeholder="Name your roll..."
            class="bg-transparent text-sm px-2 py-1 text-white focus:outline-none w-32 md:w-48 placeholder-gray-600"
            @keyup.enter="confirmSave(false)"
            @keyup.esc="cancelSave"
            ref="nameInput"
          />
          <div class="flex gap-1" v-if="currentProfileId">
             <button 
              @click="confirmSave(false)"
              class="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold"
              title="Update existing profile"
            >
              Update
            </button>
             <button 
              @click="confirmSave(true)"
              class="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs font-bold"
              title="Save as new profile"
            >
              Save Copy
            </button>
          </div>
          <button 
            v-else
            @click="confirmSave(false)"
            class="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs font-bold"
          >
            Save
          </button>
           <button 
            @click="cancelSave"
            class="bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs"
          >
            ✕
          </button>
        </div>

        <!-- Default Buttons -->
        <div v-else class="flex gap-2">
           <button 
            @click="clearSelection"
            class="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-2 rounded text-sm font-semibold transition-colors border border-gray-600"
          >
            + New Profile
          </button>
          <button 
            @click="startSave"
            class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <span v-if="hasUnsavedChanges">*</span>
            {{ currentProfileId ? 'Save Changes' : 'Save God Roll' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ... (Matrix Grid remains unchanged) ... -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Left: Builder Matrix -->
      <div class="lg:col-span-2 space-y-4">
        <!-- ... (Header and Legend) ... -->
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-lg">God Roll Selector</h4>
          <span class="text-xs uppercase tracking-wider text-gray-500">Anonymous Autumn</span>
        </div>

        <div class="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          <div class="grid grid-cols-6 gap-px bg-gray-800 border-b border-gray-700">
             <div 
              v-for="header in COLUMN_HEADERS" 
              :key="header"
              class="p-2 text-[10px] uppercase font-bold text-center text-gray-400 tracking-wider"
            >
              {{ header }}
            </div>
          </div>

          <div class="flex">
            <div 
              v-for="(column, colIndex) in matrixColumns" 
              :key="colIndex"
              class="flex-1 border-r border-gray-800 last:border-r-0"
            >
              <div 
                v-for="perk in column.perks" 
                :key="perk.id"
                class="relative h-10 border-b border-gray-800 last:border-b-0 cursor-pointer group transition-colors duration-200"
                :class="getSelectionClass(perk.id)"
                @click.exact="toggleSelection(perk.id, 'OR')"
                @click.shift.prevent="toggleSelection(perk.id, 'AND')"
              >
                <!-- Selection Indicators -->
                <div v-if="selection[perk.id] === 'AND'" class="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                <div v-if="selection[perk.id] === 'OR'" class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>

                <div class="relative z-10 flex items-center h-full px-2 gap-1.5 overflow-hidden">
                  <div class="w-5 h-5 rounded bg-gray-700 flex-shrink-0"></div> <!-- Icon -->
                  <span class="text-[10px] font-medium truncate select-none leading-tight">{{ perk.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="bg-gray-800/50 p-4 rounded text-sm text-gray-400 border border-gray-700/50 flex justify-between items-center">
          <div>
            <p><strong>Logic Explainer:</strong></p>
            <ul class="list-disc ml-5 mt-1 space-y-1 text-xs">
              <li><span class="text-blue-400">Blue (OR)</span>: Any defined perk in this column is a "hit".</li>
              <li><span class="text-orange-400">Orange (AND)</span>: The weapon MUST have this specific perk available in this column.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Right: Matches -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-lg">Your Owned Rolls</h4>
          <span class="text-xs font-mono bg-gray-800 px-2 py-1 rounded">{{ matchCount }} / {{ instances.length }}</span>
        </div>
        
        <div class="space-y-2">
          <div 
            v-for="instance in instances" 
            :key="instance.id"
            class="p-3 rounded-lg border transition-all duration-200"
            :class="getMatchClass(instance)"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-sm">{{ instance.name }}</span>
              <span 
                class="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                :class="isMatch(instance) ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-500'"
              >
                {{ isMatch(instance) ? 'Match' : 'Miss' }}
              </span>
            </div>
            
             <!-- Full Perk Matrix Tags for Instance (Updated to Flex) -->
             <div class="flex flex-wrap gap-1 min-w-0 opacity-80">
               <span 
                v-for="(perkId, idx) in instance.perks" 
                :key="idx"
                class="text-[9px] px-1 py-0.5 rounded truncate text-center"
                :class="getPerkMatchClass(perkId)"
                :title="getPerkNameById(perkId)"
              >
                {{ getPerkNameById(perkId) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom: Saved Profiles (Persistence Demo) -->
    <div class="border-t border-gray-700 pt-8">
      <h4 class="font-bold text-lg mb-4">Saved God Rolls</h4>
      
      <div v-if="savedProfiles.length === 0" class="text-center text-gray-500 py-8 bg-gray-900/30 rounded border border-dashed border-gray-700">
        No saved profiles yet. Click "Save God Roll" to create one.
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="profile in savedProfiles" 
          :key="profile.id"
          class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col gap-3 transition-colors"
          :class="{ 'ring-2 ring-blue-500 bg-gray-800': currentProfileId === profile.id }"
        >
          <!-- Header -->
          <div class="flex justify-between items-start">
            <div>
              <h5 class="font-bold text-white relative">
                 {{ profile.name }}
                 <span v-if="currentProfileId === profile.id" class="absolute -left-6 top-1 w-2 h-2 rounded-full bg-blue-500"></span>
              </h5>
              <p class="text-xs text-gray-400 font-mono">{{ new Date(profile.updatedAt).toLocaleDateString() }}</p>
            </div>
            <span class="bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded">
              {{ Object.keys(profile.selection).length }} Perks
            </span>
          </div>

          <!-- Actions -->
          <div class="mt-auto flex gap-2">
            <!-- Normal State: Load / Delete -->
            <template v-if="profileIdPendingDelete !== profile.id">
              <button 
                @click="loadProfile(profile)"
                class="flex-1 bg-blue-900/30 hover:bg-blue-900/50 text-blue-200 text-xs py-2 rounded transition-colors border border-blue-900/50"
              >
                {{ currentProfileId === profile.id ? 'Active' : 'Load' }}
              </button>
              <button 
                @click="profileIdPendingDelete = profile.id"
                class="px-3 bg-red-900/10 hover:bg-red-900/30 text-red-400 text-xs py-2 rounded transition-colors border border-red-900/20"
              >
                Delete
              </button>
            </template>
            
            <!-- Delete Confirm State -->
            <template v-else>
               <span class="text-xs text-red-400 font-bold self-center mr-auto pl-1">Sure?</span>
               <button 
                @click="deleteProfile(profile.id)"
                class="px-3 bg-red-600 hover:bg-red-500 text-white text-xs py-2 rounded transition-colors font-bold"
              >
                Yes
              </button>
              <button 
                @click="profileIdPendingDelete = null"
                class="px-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-2 rounded transition-colors"
              >
                Cancel
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ALL_PERKS, MOCK_INSTANCES, COLUMN_HEADERS, type MockPerk, type MockInstance } from './mock-data'

// --- Types ---
type SelectionType = 'OR' | 'AND' | null

interface SavedProfile {
  id: string
  name: string
  updatedAt: number
  selection: Record<string, SelectionType>
}

// --- State ---
const selection = ref<Record<string, SelectionType>>({})
const savedProfiles = ref<SavedProfile[]>([])
const currentProfileId = ref<string | null>(null)

// UI State for Actions
const isSaving = ref(false)
const newProfileName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const profileIdPendingDelete = ref<string | null>(null) // Tracks which card is showing "Are you sure?"

const instances = MOCK_INSTANCES
const allPerksMap = new Map<string, MockPerk>()
ALL_PERKS.forEach(p => allPerksMap.set(p.id, p))

// Matrix logic (6 cols)
const matrixColumns = Array.from({ length: 6 }, (_, i) => ({
  perks: ALL_PERKS.filter(p => p.colIndex === i)
}))

// --- Persistence Logic ---
const STORAGE_KEY = 'd3-god-rolls-v1'

const loadStorage = () => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      savedProfiles.value = JSON.parse(raw)
    } catch (e) {
      console.error("Failed to parse saved profiles", e)
    }
  }
}

const saveStorage = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProfiles.value))
}

const startSave = () => {
   const perkCount = Object.keys(selection.value).length
  if (perkCount === 0) {
    alert("Please select at least one perk before saving.")
    return
  }
  
  // Pre-fill name based on current state
  if (currentProfileId.value) {
    const existing = savedProfiles.value.find(p => p.id === currentProfileId.value)
    if (existing) newProfileName.value = existing.name
  } else {
    // Determine a smart default name?
    newProfileName.value = ""
  }

  isSaving.value = true
  // Focus input next tick
  nextTick(() => {
    nameInput.value?.focus()
  })
}

const cancelSave = () => {
  isSaving.value = false
}

const confirmSave = (saveAsCopy: boolean) => {
  if (!newProfileName.value.trim()) return

  const isNew = !currentProfileId.value || saveAsCopy
  
  const profile: SavedProfile = {
    id: isNew ? crypto.randomUUID() : currentProfileId.value!,
    name: newProfileName.value.trim(),
    updatedAt: Date.now(),
    selection: { ...selection.value }
  }

  if (isNew) {
    savedProfiles.value.push(profile)
     // If saving as copy, do we switch to it? Yes usually.
    currentProfileId.value = profile.id
  } else {
    // Update existing
    const idx = savedProfiles.value.findIndex(p => p.id === profile.id)
    if (idx !== -1) savedProfiles.value[idx] = profile
  }

  saveStorage()
  isSaving.value = false
}

const deleteProfile = (id: string) => {
  savedProfiles.value = savedProfiles.value.filter(p => p.id !== id)
  saveStorage()
  profileIdPendingDelete.value = null
  
  if (currentProfileId.value === id) {
    currentProfileId.value = null
    // selection.value = {} // Optional: Clear selection when active profile is deleted? Or keep it as "unsaved"? Let's keep it.
  }
}

const loadProfile = (profile: SavedProfile) => {
  selection.value = { ...profile.selection }
  currentProfileId.value = profile.id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const clearSelection = () => {
  selection.value = {}
  currentProfileId.value = null
}

const hasUnsavedChanges = computed(() => {
  if (!currentProfileId.value) return Object.keys(selection.value).length > 0
  const profile = savedProfiles.value.find(p => p.id === currentProfileId.value)
  if (!profile) return true
  return JSON.stringify(profile.selection) !== JSON.stringify(selection.value)
})

onMounted(() => {
  loadStorage()
})


// --- Interaction Logic ---

const toggleSelection = (perkId: string, type: 'OR' | 'AND') => {
  const current = selection.value[perkId]
  if (current === type) {
    delete selection.value[perkId] // toggle off
  } else {
    selection.value[perkId] = type 
  }
}

const getSelectionClass = (perkId: string) => {
  const type = selection.value[perkId]
  if (type === 'OR') return 'bg-blue-900/30 border-blue-900/50 hover:bg-blue-900/50'
  if (type === 'AND') return 'bg-orange-900/30 border-orange-900/50 hover:bg-orange-900/50'
  return 'hover:bg-gray-800'
}

const isMatch = (instance: MockInstance) => {
  for (let col = 0; col < 6; col++) {
    const colPerks = matrixColumns[col].perks.map(p => p.id)
    const activeSelections = colPerks.filter(pid => selection.value[pid])
    
    // Logic: In Mock, instance has 1 item per column (simplified).
    // If we select ANY perks in this column, the instance MUST have one of them to pass.
    if (activeSelections.length === 0) continue

    const instanceHasSelection = activeSelections.some(selId => instance.perks.includes(selId))
    if (!instanceHasSelection) return false
  }
  return true
}

const matchCount = computed(() => instances.filter(i => isMatch(i)).length)

// --- Helpers ---

const getPerkNameById = (id: string) => allPerksMap.get(id)?.name || id

const getMatchClass = (instance: MockInstance) => {
  if (isMatch(instance)) return 'bg-green-900/20 border-green-700/50'
  return 'bg-gray-800 border-gray-700 opacity-50'
}

const getPerkMatchClass = (id: string) => {
  if (selection.value[id]) {
    return selection.value[id] === 'AND' ? 'bg-orange-700 text-white font-bold' : 'bg-blue-700 text-white font-bold'
  }
  return 'bg-black/30 text-gray-400'
}

</script>
