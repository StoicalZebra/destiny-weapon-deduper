<template>
  <div
    v-if="showBanner"
    class="bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700/50 rounded-lg p-4 mb-6"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <!-- Warning icon -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <h4 class="font-semibold text-amber-800 dark:text-amber-200">Legacy Rolls Found</h4>
          <p class="text-sm text-amber-700 dark:text-amber-300/80 mt-1">
            You have {{ stats.rollCount }} roll{{ stats.rollCount === 1 ? '' : 's' }}
            across {{ stats.weaponCount }} weapon{{ stats.weaponCount === 1 ? '' : 's' }}
            stored in the old format. Migrate them to your personal wishlist for
            better DIM compatibility.
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <button
          v-if="!migrating"
          @click="handleMigrate"
          class="px-3 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
        >
          Migrate Now
        </button>
        <button
          v-if="!migrating"
          @click="handleDismiss"
          class="px-3 py-1.5 text-sm text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
          title="Dismiss for this session"
        >
          Later
        </button>
        <span v-if="migrating" class="text-sm text-amber-700 dark:text-amber-300">Migrating...</span>
      </div>
    </div>

    <!-- Migration result -->
    <div
      v-if="migrationResult"
      class="mt-3 pt-3 border-t border-amber-300 dark:border-amber-700/50"
      :class="migrationResult.errors.length > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'"
    >
      <p class="text-sm">
        <span v-if="migrationResult.migrated > 0">
          Successfully migrated {{ migrationResult.migrated }} roll{{ migrationResult.migrated === 1 ? '' : 's' }}.
        </span>
        <span v-else>No new rolls to migrate.</span>
        <span v-if="migrationResult.errors.length > 0" class="text-amber-600 dark:text-amber-400">
          {{ migrationResult.errors.length }} error{{ migrationResult.errors.length === 1 ? '' : 's' }} occurred.
        </span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistsStore } from '@/stores/wishlists'

const store = useWishlistsStore()

const dismissed = ref(false)
const migrating = ref(false)
const migrationResult = ref<{ migrated: number; errors: string[] } | null>(null)
const stats = ref({ weaponCount: 0, rollCount: 0 })

const showBanner = computed(() => {
  if (dismissed.value) return false
  if (migrationResult.value && migrationResult.value.migrated > 0) return false
  return stats.value.rollCount > 0
})

onMounted(async () => {
  // Ensure store is initialized
  if (!store.initialized) {
    await store.initialize(false)
  }

  // Check for legacy god rolls
  if (store.hasLegacyGodRolls()) {
    stats.value = store.getLegacyGodRollStats()
  }
})

function handleMigrate() {
  migrating.value = true
  try {
    migrationResult.value = store.migrateLegacyGodRolls()
    // Update stats after migration
    if (store.hasLegacyGodRolls()) {
      stats.value = store.getLegacyGodRollStats()
    } else {
      stats.value = { weaponCount: 0, rollCount: 0 }
    }
  } finally {
    migrating.value = false
  }
}

function handleDismiss() {
  dismissed.value = true
}
</script>
