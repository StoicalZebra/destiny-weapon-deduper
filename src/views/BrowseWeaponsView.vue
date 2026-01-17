<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">All Weapons</h1>
      <p class="text-text-subtle">{{ filteredWeapons.length }} weapons</p>
    </div>

    <!-- Search and Filters -->
    <div class="flex flex-col md:flex-row gap-4 mb-6">
      <!-- Search -->
      <div class="flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search weapons by name..."
          class="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg focus:outline-none focus:border-accent-primary text-text"
        />
      </div>

      <!-- Weapon Type Filter -->
      <select
        v-model="selectedType"
        class="px-4 py-2 bg-surface-elevated border border-border rounded-lg focus:outline-none focus:border-accent-primary text-text"
      >
        <option value="">All Types</option>
        <option v-for="type in weaponTypes" :key="type" :value="type">
          {{ type }}
        </option>
      </select>

      <!-- Tier Filter -->
      <select
        v-model="selectedTier"
        class="px-4 py-2 bg-surface-elevated border border-border rounded-lg focus:outline-none focus:border-accent-primary text-text"
      >
        <option value="">All Rarities</option>
        <option value="6">Exotic</option>
        <option value="5">Legendary</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="!manifestLoaded" class="text-center py-12">
      <p class="text-text-muted">Loading manifest data...</p>
    </div>

    <!-- Weapon Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <BrowseWeaponCard
        v-for="weapon in paginatedWeapons"
        :key="weapon.hash"
        :weapon="weapon"
      />
    </div>

    <!-- Empty State -->
    <div v-if="manifestLoaded && filteredWeapons.length === 0" class="text-center py-12 text-text-subtle">
      <p v-if="searchQuery || selectedType || selectedTier">
        No weapons found matching your filters
      </p>
      <p v-else>No weapons available</p>
    </div>

    <!-- Pagination -->
    <div v-if="filteredWeapons.length > pageSize" class="mt-8 flex justify-center">
      <button
        v-if="paginatedWeapons.length < filteredWeapons.length"
        @click="loadMore"
        class="px-6 py-2 bg-surface-elevated border border-border rounded-lg hover:bg-surface-overlay transition-colors text-text-muted"
      >
        Load More ({{ filteredWeapons.length - paginatedWeapons.length }} remaining)
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { manifestService, type DestinyInventoryItemDefinition } from '@/services/manifest-service'
import { useManifestStore } from '@/stores/manifest'
import BrowseWeaponCard from '@/components/weapons/BrowseWeaponCard.vue'

const manifestStore = useManifestStore()

// Search and filter state
const searchQuery = ref('')
const selectedType = ref('')
const selectedTier = ref('')

// Pagination
const pageSize = 50
const currentPage = ref(1)

// Data
const allWeapons = ref<DestinyInventoryItemDefinition[]>([])

const manifestLoaded = computed(() => manifestStore.isLoaded)

// Extract unique weapon types for filter dropdown
const weaponTypes = computed(() => {
  const types = new Set<string>()
  for (const weapon of allWeapons.value) {
    if (weapon.itemTypeDisplayName) {
      types.add(weapon.itemTypeDisplayName)
    }
  }
  return Array.from(types).sort()
})

// Filtered weapons based on search and filters
const filteredWeapons = computed(() => {
  let weapons = allWeapons.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    weapons = weapons.filter(w =>
      w.displayProperties.name.toLowerCase().includes(query)
    )
  }

  // Type filter
  if (selectedType.value) {
    weapons = weapons.filter(w => w.itemTypeDisplayName === selectedType.value)
  }

  // Tier filter
  if (selectedTier.value) {
    const tier = parseInt(selectedTier.value)
    weapons = weapons.filter(w => w.inventory?.tierType === tier)
  }

  return weapons
})

// Paginated results
const paginatedWeapons = computed(() => {
  return filteredWeapons.value.slice(0, currentPage.value * pageSize)
})

function loadMore() {
  currentPage.value++
}

// Reset pagination when filters change
function resetPagination() {
  currentPage.value = 1
}

// Load weapons when manifest is ready
async function loadWeapons() {
  if (manifestStore.isLoaded) {
    allWeapons.value = manifestService.getAllWeapons()
  }
}

onMounted(async () => {
  // Wait for manifest to load if not already loaded
  if (!manifestStore.isLoaded) {
    await manifestStore.downloadManifest()
  }
  loadWeapons()
})

// Watch for filter changes to reset pagination
import { watch } from 'vue'
watch([searchQuery, selectedType, selectedTier], resetPagination)
</script>
