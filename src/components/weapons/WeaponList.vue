<template>
  <div class="space-y-4">
    <!-- Search and Sort Controls -->
    <div class="flex flex-col sm:flex-row gap-4">
      <!-- Search bar with recent searches -->
      <div class="flex-1 relative">
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          placeholder="Search weapons..."
          class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
          @focus="showRecentSearches = true"
          @blur="hideRecentSearchesDelayed"
          @keydown.enter="addToRecentSearches"
        />

        <!-- Recent Searches Dropdown -->
        <div
          v-if="showRecentSearches && recentSearches.length > 0 && !searchQuery"
          class="absolute z-20 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden"
        >
          <div class="px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-700">
            Recent Searches
          </div>
          <button
            v-for="search in recentSearches"
            :key="search"
            class="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center justify-between group"
            @mousedown.prevent="selectRecentSearch(search)"
          >
            <span>{{ search }}</span>
            <span
              class="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              @mousedown.prevent.stop="removeRecentSearch(search)"
            >
              ×
            </span>
          </button>
          <button
            v-if="recentSearches.length > 0"
            class="w-full px-4 py-2 text-[10px] uppercase tracking-wider text-gray-500 hover:text-red-400 hover:bg-gray-700/50 transition-colors border-t border-gray-700"
            @mousedown.prevent="clearRecentSearches"
          >
            Clear All
          </button>
        </div>
      </div>

      <!-- Duplicates only toggle -->
      <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
        <div class="relative">
          <input
            type="checkbox"
            v-model="showDuplicatesOnly"
            class="sr-only peer"
          />
          <div class="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
          <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
        </div>
        <span>Duplicates only</span>
      </label>

      <!-- Sort toggle -->
      <div class="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
        <button
          @click="sortBy = 'copies'"
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          :class="sortBy === 'copies'
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-600'"
        >
          Most Duplicates
        </button>
        <button
          @click="sortBy = 'name'"
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          :class="sortBy === 'name'
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-600'"
        >
          A-Z
        </button>
      </div>
    </div>

    <!-- Weapon grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <WeaponCompactCard
        v-for="weapon in sortedWeapons"
        :key="weapon.weaponHash"
        :weapon="weapon"
      />
    </div>

    <!-- Empty state -->
    <div v-if="sortedWeapons.length === 0" class="text-center py-12 text-gray-500">
      <p v-if="searchQuery">No weapons found matching "{{ searchQuery }}"</p>
      <p v-else-if="showDuplicatesOnly && props.weapons.length > 0">
        No weapons with duplicates. Toggle off to see all {{ props.weapons.length }} weapons.
      </p>
      <p v-else>No weapons to display</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { DedupedWeapon } from '@/models/deduped-weapon'
import WeaponCompactCard from './WeaponCompactCard.vue'

const props = defineProps<{
  weapons: DedupedWeapon[]
}>()

const searchInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const sortBy = ref<'name' | 'copies'>('copies')
const showRecentSearches = ref(false)
const showDuplicatesOnly = ref(true)

// --- Recent Searches ---
const RECENT_SEARCHES_KEY = 'd3_recent_searches'
const MAX_RECENT_SEARCHES = 5

const recentSearches = ref<string[]>([])

const loadRecentSearches = () => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (stored) {
      recentSearches.value = JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load recent searches', e)
  }
}

const saveRecentSearches = () => {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches.value))
}

const addToRecentSearches = () => {
  const query = searchQuery.value.trim()
  if (!query) return

  // Remove if already exists, then add to front
  recentSearches.value = recentSearches.value.filter(s => s.toLowerCase() !== query.toLowerCase())
  recentSearches.value.unshift(query)

  // Keep only last N searches
  if (recentSearches.value.length > MAX_RECENT_SEARCHES) {
    recentSearches.value = recentSearches.value.slice(0, MAX_RECENT_SEARCHES)
  }

  saveRecentSearches()
  showRecentSearches.value = false
}

const selectRecentSearch = (search: string) => {
  searchQuery.value = search
  showRecentSearches.value = false
}

const removeRecentSearch = (search: string) => {
  recentSearches.value = recentSearches.value.filter(s => s !== search)
  saveRecentSearches()
}

const clearRecentSearches = () => {
  recentSearches.value = []
  saveRecentSearches()
}

const hideRecentSearchesDelayed = () => {
  // Small delay to allow click events on dropdown items
  setTimeout(() => {
    showRecentSearches.value = false
  }, 150)
}

// --- Filtering & Sorting ---
const duplicateFilteredWeapons = computed(() => {
  if (!showDuplicatesOnly.value) return props.weapons
  return props.weapons.filter(w => w.instances.length >= 2)
})

const filteredWeapons = computed(() => {
  if (!searchQuery.value) return duplicateFilteredWeapons.value

  const query = searchQuery.value.toLowerCase()
  return duplicateFilteredWeapons.value.filter(weapon =>
    weapon.weaponName.toLowerCase().includes(query)
  )
})

const sortedWeapons = computed(() => {
  const weapons = [...filteredWeapons.value]

  if (sortBy.value === 'copies') {
    // Most copies first, then alphabetical
    return weapons.sort((a, b) => {
      const copyDiff = b.instances.length - a.instances.length
      if (copyDiff !== 0) return copyDiff
      return a.weaponName.localeCompare(b.weaponName)
    })
  }

  // Default: alphabetical
  return weapons.sort((a, b) => a.weaponName.localeCompare(b.weaponName))
})

onMounted(() => {
  loadRecentSearches()
})
</script>
