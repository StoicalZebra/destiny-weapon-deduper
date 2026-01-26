<template>
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold text-text">Wishlists</h1>
        <p class="text-sm text-text-muted mt-1">
          {{ store.presetCount }} presets, {{ store.userCount }} custom
        </p>
      </div>

      <div class="flex gap-2">
        <!-- Check for Updates Button -->
        <button
          v-if="store.presetCount > 0"
          @click="handleCheckUpdates"
          :disabled="store.loading || checkingUpdates"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-overlay text-text hover:bg-surface-elevated disabled:opacity-50 transition-colors"
        >
          <svg
            :class="['h-4 w-4', checkingUpdates && 'animate-spin']"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ checkingUpdates ? 'Checking...' : 'Check for Updates' }}
        </button>

        <!-- Create New Button - only show when no custom wishlist exists -->
        <button
          v-if="store.canCreateUserWishlist"
          @click="showCreateModal = true"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Wishlist
        </button>
      </div>
    </div>

    <!-- Update Check Result Toast -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="updateResultMessage"
        :class="[
          'mb-4 rounded-lg px-4 py-3 flex items-center gap-3',
          updateResultType === 'success'
            ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700/50'
            : 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700/50'
        ]"
      >
        <!-- Success checkmark -->
        <svg
          v-if="updateResultType === 'success'"
          class="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <!-- Info icon -->
        <svg
          v-else
          class="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span
          :class="[
            'text-sm',
            updateResultType === 'success'
              ? 'text-green-800 dark:text-green-200'
              : 'text-blue-800 dark:text-blue-200'
          ]"
        >
          {{ updateResultMessage }}
        </span>
        <button
          @click="updateResultMessage = null"
          :class="[
            'ml-auto p-1 rounded hover:bg-black/10 dark:hover:bg-white/10',
            updateResultType === 'success'
              ? 'text-green-600 dark:text-green-400'
              : 'text-blue-600 dark:text-blue-400'
          ]"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Transition>

    <!-- Update Available Banner -->
    <div
      v-if="store.hasUpdatesAvailable"
      class="mb-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50 p-4 flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <svg class="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm text-amber-800 dark:text-amber-200">Updates available for some preset wishlists</span>
      </div>
      <button
        @click="handleRefreshAll"
        :disabled="store.loading"
        class="inline-flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 font-medium disabled:opacity-50"
      >
        <svg
          v-if="store.loading"
          class="h-4 w-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {{ store.loading ? 'Updating...' : 'Update All' }}
      </button>
    </div>

    <!-- Error Banner -->
    <div
      v-if="store.error"
      class="mb-6 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700/50 p-4"
    >
      <p class="text-sm text-red-700 dark:text-red-300">{{ store.error }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="store.loading && !store.initialized" class="text-center py-12">
      <svg class="h-8 w-8 mx-auto animate-spin text-accent-primary" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="mt-2 text-text-muted">Loading wishlists...</p>
    </div>

    <template v-else>
      <!-- Wishlists Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <WishlistCard
          v-for="wishlist in store.allWishlists"
          :key="wishlist.id"
          :wishlist="wishlist"
          :update-status="store.updateStatuses.get(wishlist.id)"
          :is-large-preset="isLargePreset(wishlist.id)"
          @refresh="handleRefresh"
          @export="handleExport"
          @delete="handleDelete"
          @unload="handleUnload"
        />
      </div>

      <!-- Empty State -->
      <div v-if="store.allWishlists.length === 0" class="text-center py-12">
        <p class="text-text-muted mb-4">No wishlists yet.</p>
        <p class="text-sm text-text-subtle">
          Load preset wishlists or import your own below.
        </p>
      </div>

      <!-- Load Premade Wishlists Button (if none loaded) -->
      <div v-if="store.presetCount === 0" class="mb-8">
        <button
          @click="handleLoadPresets"
          :disabled="store.loading"
          class="w-full py-4 rounded-lg border-2 border-dashed border-border text-text-muted hover:border-border-subtle hover:text-text transition-colors flex items-center justify-center gap-2"
        >
          <svg v-if="store.loading" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span v-if="store.loading">Loading premade wishlists...</span>
          <span v-else>Load Premade Wishlists</span>
        </button>
      </div>

      <!-- Large Wishlists Section (not auto-loaded to save storage) -->
      <div v-if="unloadedLargePresets.length > 0" class="mb-8">
        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-lg font-semibold text-text">Large Wishlists</h2>
          <span class="text-xs text-text-subtle bg-surface-overlay px-2 py-0.5 rounded">On-demand</span>
        </div>
        <p class="text-sm text-text-muted mb-4">
          These wishlists have many rolls (&gt;500) and are loaded on-demand to save storage space.
        </p>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            v-for="config in unloadedLargePresets"
            :key="config.id"
            class="rounded-xl border border-border bg-surface-elevated p-5"
          >
            <div class="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 class="text-lg font-semibold text-text">{{ config.name }}</h3>
                <p v-if="config.author" class="text-sm text-text-muted">by {{ config.author }}</p>
              </div>
              <span class="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 px-2 py-0.5 text-xs font-medium">
                Large
              </span>
            </div>

            <p class="text-sm text-text-muted mb-4 line-clamp-2">{{ config.description }}</p>

            <button
              @click="handleLoadLargePreset(config.id)"
              :disabled="loadingPresetId === config.id"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-overlay text-text hover:bg-surface-elevated disabled:opacity-50 transition-colors"
            >
              <svg v-if="loadingPresetId === config.id" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {{ loadingPresetId === config.id ? 'Loading...' : 'Load Wishlist' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Import Section -->
      <WishlistImportExport @imported="handleImported" />
    </template>

    <!-- Create Wishlist Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="showCreateModal = false"
    >
      <div class="w-full max-w-md rounded-xl bg-surface-elevated border border-border p-6">
        <h2 class="text-xl font-semibold text-text mb-4">Create New Wishlist</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Name</label>
            <input
              v-model="newWishlistName"
              type="text"
              placeholder="My PvP Rolls"
              class="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-border text-text placeholder-text-subtle focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Description (optional)</label>
            <textarea
              v-model="newWishlistDescription"
              rows="2"
              placeholder="My preferred rolls for Crucible"
              class="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-border text-text placeholder-text-subtle focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button
            @click="showCreateModal = false"
            class="px-4 py-2 rounded-lg bg-surface-overlay text-text-muted hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleCreate"
            :disabled="!newWishlistName.trim()"
            class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="deletingWishlist"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="deletingWishlist = null"
    >
      <div class="w-full max-w-md rounded-xl bg-surface-elevated border border-border p-6">
        <h2 class="text-xl font-semibold mb-4 text-red-600 dark:text-red-400">Delete Wishlist</h2>
        <p class="text-sm text-text-muted">
          Are you sure you want to delete "{{ deletingWishlist.name }}"? This cannot be undone.
        </p>

        <div class="flex justify-end gap-2 mt-6">
          <button
            @click="deletingWishlist = null"
            class="px-4 py-2 rounded-lg bg-surface-overlay text-text-muted hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            @click="confirmDelete"
            class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistsStore } from '@/stores/wishlists'
import { WishlistCard, WishlistImportExport } from '@/components/wishlists'
import { presetWishlistService } from '@/services/preset-wishlist-service'
import type { Wishlist } from '@/models/wishlist'

const store = useWishlistsStore()

// UI state
const showCreateModal = ref(false)
const newWishlistName = ref('')
const newWishlistDescription = ref('')
const deletingWishlist = ref<Wishlist | null>(null)
const loadingPresetId = ref<string | null>(null)

// Update checking state
const checkingUpdates = ref(false)
const updateResultMessage = ref<string | null>(null)
const updateResultType = ref<'info' | 'success'>('info')

// Computed
const unloadedLargePresets = computed(() => store.getUnloadedLargePresetConfigs())

// Helper to check if a wishlist is a large preset
function isLargePreset(wishlistId: string): boolean {
  return presetWishlistService.getLargePresetConfigs().some((c) => c.id === wishlistId)
}

// Initialize on mount
onMounted(async () => {
  if (!store.initialized) {
    await store.initialize()
  }
})

// Actions
async function handleLoadPresets() {
  await store.loadPresets()
}

async function handleLoadLargePreset(presetId: string) {
  loadingPresetId.value = presetId
  try {
    await store.loadLargePreset(presetId)
  } finally {
    loadingPresetId.value = null
  }
}

async function handleCheckUpdates() {
  checkingUpdates.value = true
  updateResultMessage.value = null

  try {
    await store.checkForUpdates()

    // Count updates available
    const updatesAvailable = Array.from(store.updateStatuses.values()).filter((s) => s.hasUpdate).length

    if (updatesAvailable === 0) {
      updateResultMessage.value = 'All wishlists are up to date'
      updateResultType.value = 'success'
    } else if (updatesAvailable === 1) {
      updateResultMessage.value = '1 update available'
      updateResultType.value = 'info'
    } else {
      updateResultMessage.value = `${updatesAvailable} updates available`
      updateResultType.value = 'info'
    }

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      updateResultMessage.value = null
    }, 4000)
  } finally {
    checkingUpdates.value = false
  }
}

async function handleRefreshAll() {
  await store.refreshAllPresets()
}

function handleCreate() {
  if (!newWishlistName.value.trim()) return

  store.createUserWishlist(newWishlistName.value.trim(), newWishlistDescription.value.trim() || undefined)

  newWishlistName.value = ''
  newWishlistDescription.value = ''
  showCreateModal.value = false
}

async function handleRefresh(wishlist: Wishlist) {
  await store.refreshPreset(wishlist.id)
}

function handleExport(wishlist: Wishlist) {
  const content = store.exportToDimFormat(wishlist.id)
  if (!content) return

  // Download as file
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${wishlist.name.replace(/[^a-z0-9]/gi, '_')}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function handleDelete(wishlist: Wishlist) {
  deletingWishlist.value = wishlist
}

async function handleUnload(wishlist: Wishlist) {
  await store.unloadLargePreset(wishlist.id)
}

function confirmDelete() {
  if (!deletingWishlist.value) return

  store.deleteUserWishlist(deletingWishlist.value.id)
  deletingWishlist.value = null
}

function handleImported() {
  // Could show a toast or refresh something
}
</script>
