<template>
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Wishlists</h1>
        <p class="text-sm text-gray-400 mt-1">
          {{ store.presetCount }} presets, {{ store.userCount }} custom
        </p>
      </div>

      <div class="flex gap-2">
        <!-- Check for Updates Button -->
        <button
          v-if="store.presetCount > 0"
          @click="handleCheckUpdates"
          :disabled="store.loading"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          <svg
            :class="['h-4 w-4', store.loading && 'animate-spin']"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Check for Updates
        </button>

        <!-- Create New Button -->
        <button
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

    <!-- Update Available Banner -->
    <div
      v-if="store.hasUpdatesAvailable"
      class="mb-6 rounded-lg bg-amber-900/30 border border-amber-700/50 p-4 flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <svg class="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm text-amber-200">Updates available for some preset wishlists</span>
      </div>
      <button
        @click="handleRefreshAll"
        :disabled="store.loading"
        class="inline-flex items-center gap-2 text-sm text-amber-300 hover:text-amber-200 font-medium disabled:opacity-50"
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
      class="mb-6 rounded-lg bg-red-900/30 border border-red-700/50 p-4"
    >
      <p class="text-sm text-red-300">{{ store.error }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="store.loading && !store.initialized" class="text-center py-12">
      <svg class="h-8 w-8 mx-auto animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="mt-2 text-gray-400">Loading wishlists...</p>
    </div>

    <template v-else>
      <!-- Wishlists Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <WishlistCard
          v-for="wishlist in store.allWishlists"
          :key="wishlist.id"
          :wishlist="wishlist"
          :update-status="store.updateStatuses.get(wishlist.id)"
          @refresh="handleRefresh"
          @export="handleExport"
          @delete="handleDelete"
        />
      </div>

      <!-- Empty State -->
      <div v-if="store.allWishlists.length === 0" class="text-center py-12">
        <p class="text-gray-400 mb-4">No wishlists yet.</p>
        <p class="text-sm text-gray-500">
          Load preset wishlists or import your own below.
        </p>
      </div>

      <!-- Load Presets Button (if no presets loaded) -->
      <div v-if="store.presetCount === 0" class="mb-8">
        <button
          @click="handleLoadPresets"
          :disabled="store.loading"
          class="w-full py-4 rounded-lg border-2 border-dashed border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors"
        >
          <span v-if="store.loading">Loading preset wishlists...</span>
          <span v-else>Load Preset Wishlists (Voltron, Pandapaxxy, etc.)</span>
        </button>
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
      <div class="w-full max-w-md rounded-xl bg-gray-800 border border-gray-700 p-6">
        <h2 class="text-xl font-semibold mb-4">Create New Wishlist</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              v-model="newWishlistName"
              type="text"
              placeholder="My PvP Rolls"
              class="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Description (optional)</label>
            <textarea
              v-model="newWishlistDescription"
              rows="2"
              placeholder="My preferred rolls for Crucible"
              class="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button
            @click="showCreateModal = false"
            class="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
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
      <div class="w-full max-w-md rounded-xl bg-gray-800 border border-gray-700 p-6">
        <h2 class="text-xl font-semibold mb-4 text-red-400">Delete Wishlist</h2>
        <p class="text-sm text-gray-400">
          Are you sure you want to delete "{{ deletingWishlist.name }}"? This cannot be undone.
        </p>

        <div class="flex justify-end gap-2 mt-6">
          <button
            @click="deletingWishlist = null"
            class="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
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
import { ref, onMounted } from 'vue'
import { useWishlistsStore } from '@/stores/wishlists'
import { WishlistCard, WishlistImportExport } from '@/components/wishlists'
import type { Wishlist } from '@/models/wishlist'

const store = useWishlistsStore()

// UI state
const showCreateModal = ref(false)
const newWishlistName = ref('')
const newWishlistDescription = ref('')
const deletingWishlist = ref<Wishlist | null>(null)

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

async function handleCheckUpdates() {
  await store.checkForUpdates()
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

function confirmDelete() {
  if (!deletingWishlist.value) return

  store.deleteUserWishlist(deletingWishlist.value.id)
  deletingWishlist.value = null
}

function handleImported() {
  // Could show a toast or refresh something
}
</script>
