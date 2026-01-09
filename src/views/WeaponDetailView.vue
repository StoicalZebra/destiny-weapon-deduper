<template>
  <!-- Owned weapon: full detail view -->
  <WeaponDetailLayout
    v-if="selectedWeapon"
    :weapon="selectedWeapon"
    :loading="weaponsStore.loading"
    :error="weaponsStore.error"
    :initial-tab="initialTab"
    back-label="Back to all weapons"
    loading-message="Loading your arsenal..."
    @back="router.push('/')"
  />

  <!-- Unowned weapon with god rolls: placeholder view -->
  <UnownedWeaponGodRolls
    v-else-if="!weaponsStore.loading && hasGodRolls && weaponFromManifest"
    :weapon-hash="weaponHash"
    :weapon-def="weaponFromManifest"
    @back="router.push('/godrolls')"
  />

  <!-- Loading state -->
  <div v-else-if="weaponsStore.loading" class="text-center py-12">
    <div class="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    <p class="mt-4 text-gray-400">Loading your arsenal...</p>
  </div>

  <!-- Error state -->
  <div v-else-if="weaponsStore.error" class="text-center py-12">
    <p class="text-red-400">{{ weaponsStore.error }}</p>
  </div>

  <!-- Not found state -->
  <div v-else class="text-center py-12">
    <h1 class="text-3xl font-bold mb-4">Weapon Details</h1>
    <p class="text-gray-500">Weapon not found. Try returning to the list.</p>
    <button
      @click="router.push('/')"
      class="mt-4 text-sm text-blue-400 hover:text-blue-300"
    >
      &larr; Back to all weapons
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWeaponsStore } from '@/stores/weapons'
import { useAuthStore } from '@/stores/auth'
import { manifestService } from '@/services/manifest-service'
import WeaponDetailLayout from '@/components/weapons/WeaponDetailLayout.vue'
import UnownedWeaponGodRolls from '@/components/weapons/UnownedWeaponGodRolls.vue'

const route = useRoute()
const router = useRouter()
const weaponsStore = useWeaponsStore()
const authStore = useAuthStore()

const weaponHash = computed(() => {
  const raw = route.params.weaponHash
  return typeof raw === 'string' ? Number(raw) : Array.isArray(raw) ? Number(raw[0]) : NaN
})

const initialTab = computed<'coverage' | 'godroll'>(() => {
  return route.query.tab === 'godrolls' ? 'godroll' : 'coverage'
})

const selectedWeapon = computed(() => {
  if (!Number.isFinite(weaponHash.value)) return null
  return weaponsStore.weapons.find(weapon => weapon.weaponHash === weaponHash.value) || null
})

// Check if god rolls exist for this weapon in localStorage
const hasGodRolls = computed(() => {
  if (!Number.isFinite(weaponHash.value)) return false
  try {
    const key = `d3_godroll_${weaponHash.value}`
    const data = localStorage.getItem(key)
    if (!data) return false
    const profiles = JSON.parse(data)
    return Array.isArray(profiles) && profiles.length > 0
  } catch {
    return false
  }
})

// Get weapon definition from manifest (for unowned weapons)
const weaponFromManifest = computed(() => {
  if (selectedWeapon.value) return null // Already have full weapon data
  if (!Number.isFinite(weaponHash.value)) return null
  return manifestService.getInventoryItem(weaponHash.value)
})

const loadWeapons = async () => {
  if (authStore.destinyMemberships.length === 0) {
    await authStore.loadDestinyMemberships()
  }
  await weaponsStore.loadWeapons()
}

onMounted(() => {
  if (weaponsStore.weapons.length === 0) {
    loadWeapons()
  }
})
</script>
