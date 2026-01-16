<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">Your Weapons</h1>

    <div v-if="weaponsStore.loading" class="text-center py-12">
      <LoadingSpinner />
      <p class="mt-4 text-text-muted">Loading your arsenal...</p>
    </div>

    <ErrorMessage v-else-if="weaponsStore.error" :message="weaponsStore.error" />

    <div v-else-if="weaponsStore.weapons.length === 0" class="text-center py-12">
      <p class="text-text-muted">No weapons found. This could mean:</p>
      <ul class="mt-4 text-sm text-text-subtle">
        <li>You haven't loaded your inventory yet</li>
        <li>There was an error fetching your data</li>
      </ul>
      <button
        @click="loadWeapons"
        class="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
      >
        Load Weapons
      </button>
    </div>

    <div v-else>
      <!-- Stats summary -->
      <div class="mb-6 p-4 bg-surface-elevated rounded-lg border border-border">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div>
            <p class="text-3xl font-bold text-orange-500 dark:text-orange-400">{{ duplicateCount }}</p>
            <p class="text-sm text-text-muted">Duplicates</p>
          </div>
          <div>
            <p class="text-3xl font-bold text-accent-primary">{{ weaponsStore.weapons.length }}</p>
            <p class="text-sm text-text-muted">Unique Weapons</p>
          </div>
          <div class="col-span-2 md:col-span-1">
            <p class="text-3xl font-bold text-green-500 dark:text-green-400">{{ weaponsStore.weaponInstances.length }}</p>
            <p class="text-sm text-text-muted">Total Instances</p>
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
