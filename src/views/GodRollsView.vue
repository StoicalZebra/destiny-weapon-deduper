<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-2">God Roll Manager</h1>
    <p class="text-sm text-gray-400 mb-6">
      {{ totalRolls }} rolls across {{ weapons.length }} weapons
    </p>

    <!-- Search and Sort -->
    <div class="flex gap-4 mb-6">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search weapons..."
        class="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />
      <select
        v-model="sortBy"
        class="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
      >
        <option value="name">A-Z</option>
        <option value="profiles">Most Profiles</option>
      </select>
    </div>

    <!-- Empty State -->
    <div v-if="weapons.length === 0" class="text-center py-12">
      <p class="text-gray-400 mb-4">No god rolls saved yet.</p>
      <p class="text-sm text-gray-500">
        Import god rolls from the
        <RouterLink to="/settings" class="text-blue-400 hover:text-blue-300 underline">Settings</RouterLink>
        page, or save rolls from weapon detail pages.
      </p>
    </div>

    <!-- Weapon List -->
    <div v-else class="space-y-3">
      <RouterLink
        v-for="weapon in filteredWeapons"
        :key="weapon.hash"
        :to="`/weapons/${weapon.hash}?tab=godrolls`"
        class="block rounded-xl border border-gray-700 bg-gray-800 p-4 hover:border-gray-500 hover:bg-gray-750 transition-colors"
      >
        <div class="flex items-center gap-4">
          <!-- Weapon Icon -->
          <img
            v-if="weapon.icon"
            :src="`https://www.bungie.net${weapon.icon}`"
            :alt="weapon.name"
            class="w-12 h-12 rounded"
          />
          <div v-else class="w-12 h-12 rounded bg-gray-700 flex items-center justify-center">
            <span class="text-gray-500 text-xs">?</span>
          </div>

          <!-- Weapon Info -->
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-white truncate">{{ weapon.name }}</h3>
            <div class="flex flex-wrap gap-2 mt-1">
              <span
                v-for="profile in weapon.profiles"
                :key="profile.id"
                class="text-xs px-2 py-0.5 rounded-full"
                :class="getProfileClass(profile.name)"
              >
                {{ profile.name }}
              </span>
            </div>
          </div>

          <!-- Profile Count Badge -->
          <div class="text-right">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-sm font-medium">
              {{ weapon.profiles.length }}
            </span>
          </div>
        </div>

        <!-- Source Info (Author + Notes) -->
        <div v-if="getFirstSource(weapon.profiles) || getFirstNote(weapon.profiles)" class="mt-3 text-xs text-gray-500 truncate pl-16">
          <span v-if="getFirstSource(weapon.profiles)" class="text-purple-400">
            {{ getFirstSource(weapon.profiles) }}
          </span>
          <span v-if="getFirstSource(weapon.profiles) && getFirstNote(weapon.profiles)"> · </span>
          <span v-if="getFirstNote(weapon.profiles)">{{ getFirstNote(weapon.profiles) }}</span>
        </div>
      </RouterLink>
    </div>

    <!-- No Results -->
    <div v-if="weapons.length > 0 && filteredWeapons.length === 0" class="text-center py-8">
      <p class="text-gray-400">No weapons match "{{ searchQuery }}"</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { godRollStorageService, type SavedProfile } from '@/services/godroll-storage-service'
import { manifestService } from '@/services/manifest-service'

interface WeaponWithProfiles {
  hash: number
  name: string
  icon: string | null
  profiles: SavedProfile[]
}

const weapons = ref<WeaponWithProfiles[]>([])
const searchQuery = ref('')
const sortBy = ref<'name' | 'profiles'>('name')

const totalRolls = computed(() => {
  return weapons.value.reduce((sum, w) => sum + w.profiles.length, 0)
})

const filteredWeapons = computed(() => {
  let result = weapons.value

  // Filter by search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(w => w.name.toLowerCase().includes(query))
  }

  // Sort
  if (sortBy.value === 'name') {
    result = [...result].sort((a, b) => a.name.localeCompare(b.name))
  } else {
    result = [...result].sort((a, b) => b.profiles.length - a.profiles.length)
  }

  return result
})

function getProfileClass(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('pve')) return 'bg-green-900/50 text-green-300'
  if (lower.includes('pvp')) return 'bg-red-900/50 text-red-300'
  if (lower.includes('both')) return 'bg-purple-900/50 text-purple-300'
  return 'bg-gray-700 text-gray-300'
}

function getFirstNote(profiles: SavedProfile[]): string | null {
  for (const p of profiles) {
    if (p.notes?.trim()) return p.notes
  }
  return null
}

function getFirstSource(profiles: SavedProfile[]): string | null {
  for (const p of profiles) {
    if (p.source?.author) return p.source.author
  }
  return null
}

onMounted(async () => {
  const allRolls = godRollStorageService.getAllGodRolls()

  const weaponList: WeaponWithProfiles[] = []

  for (const [hash, profiles] of allRolls) {
    const def = manifestService.getInventoryItem(hash)
    weaponList.push({
      hash,
      name: def?.displayProperties?.name || `Unknown (${hash})`,
      icon: def?.displayProperties?.icon || null,
      profiles
    })
  }

  weapons.value = weaponList
})
</script>

<style scoped>
.bg-gray-750 {
  background-color: rgb(55, 65, 81);
}
</style>
