<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">Your Weapons</h1>

    <div v-if="weaponsStore.loading" class="text-center py-12">
      <LoadingSpinner />
      <p class="mt-4 text-gray-400">Loading your arsenal...</p>
    </div>

    <ErrorMessage v-else-if="weaponsStore.error" :message="weaponsStore.error" />

    <div v-else-if="weaponsStore.weapons.length === 0" class="text-center py-12">
      <p class="text-gray-400">No weapons found. This could mean:</p>
      <ul class="mt-4 text-sm text-gray-500">
        <li>You haven't loaded your inventory yet</li>
        <li>There was an error fetching your data</li>
      </ul>
      <button
        @click="loadWeapons"
        class="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
      >
        Load Weapons
      </button>
    </div>

    <div v-else>
      <!-- Stats summary -->
      <div class="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div>
            <p class="text-3xl font-bold text-blue-400">{{ weaponsStore.weapons.length }}</p>
            <p class="text-sm text-gray-400">Unique Weapons</p>
          </div>
          <div>
            <p class="text-3xl font-bold text-green-400">{{ weaponsStore.weaponInstances.length }}</p>
            <p class="text-sm text-gray-400">Total Instances</p>
          </div>
          <div class="col-span-2 md:col-span-1">
            <p class="text-3xl font-bold text-orange-400">{{ duplicateCount }}</p>
            <p class="text-sm text-gray-400">Duplicates</p>
          </div>
        </div>
      </div>

      <WeaponList :weapons="weaponsStore.weapons" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useWeaponsStore } from '@/stores/weapons'
import { useAuthStore } from '@/stores/auth'
import WeaponList from '@/components/weapons/WeaponList.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'

const weaponsStore = useWeaponsStore()
const authStore = useAuthStore()

const duplicateCount = computed(() => {
  const total = weaponsStore.weaponInstances.length
  const unique = weaponsStore.weapons.length
  return Math.max(0, total - unique)
})

const loadWeapons = async () => {
  // Ensure memberships are loaded first
  if (authStore.destinyMemberships.length === 0) {
    console.log('Loading Destiny memberships...')
    await authStore.loadDestinyMemberships()
  }

  // Now load weapons
  await weaponsStore.loadWeapons()
}

onMounted(() => {
  if (weaponsStore.weapons.length === 0) {
    loadWeapons()
  }
})
</script>
