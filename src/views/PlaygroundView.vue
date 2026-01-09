<template>
  <div>
    <!-- Weapon Detail Mode (using shared layout) -->
    <WeaponDetailLayout
      v-if="selectedWeapon"
      :weapon="selectedWeapon"
      subtitle="(demo)"
      back-label="Back to weapon list"
      @back="selectedWeaponHash = null"
    />

    <!-- Weapon List Mode -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">Demo Mode</h1>
          <p class="text-sm text-gray-500">Explore the UI without logging in</p>
        </div>
      </div>

      <!-- Loading Manifest -->
      <div v-if="manifestStore.loading" class="text-center py-12">
        <LoadingSpinner />
        <p class="mt-4 text-gray-400">Loading game data...</p>
        <div v-if="manifestStore.downloadProgress" class="mt-2">
          <div class="w-64 mx-auto bg-gray-800 rounded-full h-2">
            <div
              class="bg-blue-500 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${manifestStore.progressPercentage}%` }"
            ></div>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            {{ manifestStore.currentTable || 'Preparing...' }}
          </p>
        </div>
      </div>

      <!-- Error State -->
      <ErrorMessage v-else-if="manifestStore.error" :message="manifestStore.error" />

      <!-- Loading Weapons -->
      <div v-else-if="loadingWeapons" class="text-center py-12">
        <LoadingSpinner />
        <p class="mt-4 text-gray-400">Generating showcase weapons...</p>
      </div>

      <!-- Weapon Grid -->
      <div v-else class="space-y-6">
        <p class="text-gray-400">
          Select a weapon below to see the full perk coverage and god roll experience.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            v-for="weapon in showcaseWeapons"
            :key="weapon.weaponHash"
            @click="selectedWeaponHash = weapon.weaponHash"
            class="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-blue-500 hover:bg-gray-800 transition-all text-left group"
          >
            <div class="flex items-center gap-3">
              <img
                v-if="weapon.weaponIcon"
                :src="`https://www.bungie.net${weapon.weaponIcon}`"
                :alt="weapon.weaponName"
                class="h-12 w-12 rounded"
              />
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-white group-hover:text-blue-300 truncate">
                  {{ weapon.weaponName }}
                </h3>
                <p class="text-xs text-gray-500">
                  {{ weapon.instances.length }} copies
                </p>
              </div>
            </div>

            <!-- Completion bar -->
            <div class="mt-3">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-gray-500">Coverage</span>
                <span class="text-gray-400">{{ weapon.completionPercentage }}%</span>
              </div>
              <div class="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  class="bg-blue-500 h-1.5 rounded-full transition-all"
                  :style="{ width: `${weapon.completionPercentage}%` }"
                ></div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useManifestStore } from '@/stores/manifest'
import { getShowcaseWeapons, getShowcaseWeapon } from '@/services/playground-mock-service'
import WeaponDetailLayout from '@/components/weapons/WeaponDetailLayout.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import type { DedupedWeapon } from '@/models/deduped-weapon'

const route = useRoute()
const router = useRouter()
const manifestStore = useManifestStore()

// State
const showcaseWeapons = ref<DedupedWeapon[]>([])
const loadingWeapons = ref(false)
const selectedWeaponHash = ref<number | null>(null)

// Computed
const selectedWeapon = computed(() => {
  if (!selectedWeaponHash.value) return null
  return showcaseWeapons.value.find(w => w.weaponHash === selectedWeaponHash.value) || null
})

// Sync URL with selected weapon
watch(selectedWeaponHash, (hash) => {
  const currentHash = route.params.weaponHash
    ? Number(route.params.weaponHash)
    : null

  if (hash !== currentHash) {
    if (hash) {
      router.replace({ path: `/playground/${hash}` })
    } else {
      router.replace({ path: '/playground' })
    }
  }
})

// Load showcase weapons
async function loadShowcaseWeapons() {
  loadingWeapons.value = true
  try {
    showcaseWeapons.value = await getShowcaseWeapons()

    // Check if URL has a weapon hash
    const urlHash = route.params.weaponHash
    if (urlHash) {
      const hash = Number(urlHash)
      if (showcaseWeapons.value.some(w => w.weaponHash === hash)) {
        selectedWeaponHash.value = hash
      } else {
        // Try to load this specific weapon
        const weapon = await getShowcaseWeapon(hash)
        if (weapon) {
          showcaseWeapons.value.push(weapon)
          selectedWeaponHash.value = hash
        }
      }
    }
  } catch (err) {
    console.error('Failed to load showcase weapons:', err)
  } finally {
    loadingWeapons.value = false
  }
}

// Initialize
onMounted(async () => {
  // Initialize manifest (will use cache if available)
  await manifestStore.initialize()

  // Load showcase weapons once manifest is ready
  if (manifestStore.isInitialized) {
    await loadShowcaseWeapons()
  }
})

// Watch for manifest initialization
watch(() => manifestStore.isInitialized, async (initialized) => {
  if (initialized && showcaseWeapons.value.length === 0) {
    await loadShowcaseWeapons()
  }
})
</script>
