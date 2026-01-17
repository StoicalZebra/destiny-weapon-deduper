<template>
  <!-- Browse mode: weapon from manifest (no ownership required) -->
  <WeaponDetailLayout
    v-if="isBrowseMode && browseWeapon"
    :weapon="browseWeapon"
    :loading="manifestLoading"
    :is-browse-mode="true"
    :edit-item-id="editItemId"
    :edit-wishlist-id="editWishlistId"
    back-label="Back to all weapons"
    loading-message="Loading weapon data..."
    @back="router.push('/browse')"
  />

  <!-- Owned weapon: full detail view -->
  <WeaponDetailLayout
    v-else-if="selectedWeapon"
    :weapon="selectedWeapon"
    :loading="weaponsStore.loading"
    :error="weaponsStore.error"
    :edit-item-id="editItemId"
    :edit-wishlist-id="editWishlistId"
    back-label="Back to inventory"
    loading-message="Loading your arsenal..."
    @back="router.push('/')"
  />

  <!-- Unowned weapon with god rolls: placeholder view -->
  <UnownedWeaponGodRolls
    v-else-if="!weaponsStore.loading && hasGodRolls && weaponFromManifest"
    :weapon-hash="weaponHash"
    :weapon-def="weaponFromManifest"
    @back="router.push('/')"
  />

  <!-- Loading state (browse mode) -->
  <div v-else-if="isBrowseMode && manifestLoading" class="text-center py-12">
    <div class="inline-block w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
    <p class="mt-4 text-text-muted">Loading weapon data...</p>
  </div>

  <!-- Loading state (inventory mode) -->
  <div v-else-if="weaponsStore.loading" class="text-center py-12">
    <div class="inline-block w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
    <p class="mt-4 text-text-muted">Loading your arsenal...</p>
  </div>

  <!-- Error state -->
  <div v-else-if="weaponsStore.error" class="text-center py-12">
    <p class="text-red-600 dark:text-red-400">{{ weaponsStore.error }}</p>
  </div>

  <!-- Not found state -->
  <div v-else class="text-center py-12">
    <h1 class="text-3xl font-bold mb-4 text-text">Weapon Details</h1>
    <p class="text-text-subtle">Weapon not found. Try returning to the list.</p>
    <button
      @click="router.push(isBrowseMode ? '/browse' : '/')"
      class="mt-4 text-sm text-accent-primary hover:text-accent-primary/80"
    >
      &larr; {{ isBrowseMode ? 'Back to all weapons' : 'Back to inventory' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWeaponsStore } from '@/stores/weapons'
import { useAuthStore } from '@/stores/auth'
import { useManifestStore } from '@/stores/manifest'
import { manifestService } from '@/services/manifest-service'
import { buildDedupedWeaponFromManifest } from '@/services/deduplication'
import WeaponDetailLayout from '@/components/weapons/WeaponDetailLayout.vue'
import UnownedWeaponGodRolls from '@/components/weapons/UnownedWeaponGodRolls.vue'

const route = useRoute()
const router = useRouter()
const weaponsStore = useWeaponsStore()
const authStore = useAuthStore()
const manifestStore = useManifestStore()

// Browse mode detection
const isBrowseMode = computed(() => route.name === 'browse-weapon-detail')

const manifestLoading = ref(false)

const weaponHash = computed(() => {
  const raw = route.params.weaponHash
  return typeof raw === 'string' ? Number(raw) : Array.isArray(raw) ? Number(raw[0]) : NaN
})

// Edit mode params from wishlist detail page
const editItemId = computed(() => route.query.editItemId as string | undefined)
const editWishlistId = computed(() => route.query.wishlistId as string | undefined)

const selectedWeapon = computed(() => {
  if (!Number.isFinite(weaponHash.value)) return null
  return weaponsStore.weapons.find(weapon => weapon.weaponHash === weaponHash.value) || null
})

// Check if user owns this weapon (for browse mode redirect)
// Must check all variant hashes since the user might own a different variant (e.g., holofoil)
const ownedWeapon = computed(() => {
  if (!Number.isFinite(weaponHash.value)) return null
  // Get all variant hashes for this weapon (includes holofoil + normal)
  const variantHashes = manifestService.getWeaponVariantHashes(weaponHash.value)
  const variantSet = new Set(variantHashes)
  // Check if user owns any variant of this weapon
  return weaponsStore.weapons.find(weapon => variantSet.has(weapon.weaponHash)) || null
})

// Build DedupedWeapon from manifest for browse mode (no ownership data)
// Only used if the user doesn't own the weapon
const browseWeapon = computed(() => {
  if (!isBrowseMode.value) return null
  if (!Number.isFinite(weaponHash.value)) return null
  if (!manifestStore.isLoaded) return null
  // If user owns this weapon, don't build browse version (will redirect)
  if (ownedWeapon.value) return null
  return buildDedupedWeaponFromManifest(weaponHash.value)
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

const loadManifestForBrowse = async () => {
  if (!manifestStore.isLoaded) {
    manifestLoading.value = true
    await manifestStore.downloadManifest()
    manifestLoading.value = false
  }
}

// In browse mode, redirect to inventory view if user owns the weapon
watch(ownedWeapon, (weapon) => {
  if (isBrowseMode.value && weapon) {
    // User owns this weapon (possibly a different variant), redirect to inventory detail view
    // Use the owned weapon's hash, not the URL hash (they may differ for variants)
    router.replace(`/weapons/${weapon.weaponHash}`)
  }
}, { immediate: true })

onMounted(async () => {
  if (isBrowseMode.value) {
    // Browse mode: load manifest first
    await loadManifestForBrowse()
    // If user is authenticated, also load their weapons to check ownership
    if (authStore.isAuthenticated && weaponsStore.weapons.length === 0) {
      await loadWeapons()
    }
  } else if (weaponsStore.weapons.length === 0) {
    // Inventory mode: load user's weapons
    loadWeapons()
  }
})
</script>
