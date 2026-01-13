<template>
  <div class="max-w-6xl mx-auto">
    <!-- Back Link -->
    <router-link
      to="/wishlists"
      class="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Wishlists
    </router-link>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <svg class="h-8 w-8 mx-auto animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <!-- Not Found -->
    <div v-else-if="!wishlist" class="text-center py-12">
      <p class="text-gray-400">Wishlist not found</p>
      <router-link to="/wishlists" class="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
        View all wishlists
      </router-link>
    </div>

    <template v-else>
      <!-- Admin: Unsaved Changes Banner -->
      <div
        v-if="isEditable && hasUnsavedChanges"
        class="mb-4 rounded-lg bg-amber-900/30 border border-amber-700/50 p-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <svg class="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span class="text-sm text-amber-200">
            You have local changes. Export to update GitHub.
          </span>
        </div>
        <button
          @click="handleExportAndMarkSaved"
          class="inline-flex items-center gap-2 text-sm bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg"
        >
          Export to File
        </button>
      </div>

      <!-- Header -->
      <div class="rounded-xl border border-gray-700 bg-gray-800 p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-bold">{{ wishlist.name }}</h1>
              <span
                :class="[
                  'text-xs px-2 py-0.5 rounded-full',
                  wishlist.sourceType === 'preset'
                    ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                    : 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                ]"
              >
                {{ wishlist.sourceType === 'preset' ? 'Preset' : 'Custom' }}
              </span>
            </div>
            <p v-if="wishlist.description" class="mt-2 text-gray-400">
              {{ wishlist.description }}
            </p>
            <p v-if="wishlist.author" class="mt-1 text-sm text-gray-500">
              by {{ wishlist.author }}
            </p>
          </div>

          <div class="flex gap-2">
            <button
              @click="handleExport"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors text-sm"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="mt-4 flex gap-6 text-sm">
          <div>
            <span class="text-gray-500">Items:</span>
            <span class="ml-1 font-medium">{{ stats.itemCount.toLocaleString() }}</span>
          </div>
          <div>
            <span class="text-gray-500">Weapons:</span>
            <span class="ml-1 font-medium">{{ stats.weaponCount.toLocaleString() }}</span>
          </div>
          <div v-if="wishlist.lastUpdated">
            <span class="text-gray-500">Updated:</span>
            <span class="ml-1 font-medium">{{ formatDate(wishlist.lastUpdated) }}</span>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div class="mb-6">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by weapon name or notes..."
          class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <!-- Items grouped by weapon -->
      <div class="space-y-4">
        <div
          v-for="[weaponHash, items] in filteredGroups"
          :key="weaponHash"
          class="rounded-xl border border-gray-700 bg-gray-800 p-4"
        >
          <!-- Weapon Header -->
          <div class="flex items-center gap-3 mb-3">
            <img
              v-if="getWeaponIcon(weaponHash)"
              :src="`https://www.bungie.net${getWeaponIcon(weaponHash)}`"
              :alt="getWeaponName(weaponHash)"
              class="w-10 h-10 rounded"
            />
            <div v-else class="w-10 h-10 rounded bg-gray-700 flex items-center justify-center">
              <span class="text-gray-500 text-xs">?</span>
            </div>
            <div>
              <h3 class="font-semibold">{{ getWeaponName(weaponHash) }}</h3>
              <p class="text-xs text-gray-500">{{ items.length }} {{ items.length === 1 ? 'roll' : 'rolls' }}</p>
            </div>
          </div>

          <!-- Items for this weapon -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <div
              v-for="item in items"
              :key="item.id"
              class="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50"
            >
              <!-- Tags -->
              <div class="flex flex-wrap gap-1 mb-2">
                <span
                  v-for="tag in item.tags || []"
                  :key="tag"
                  :class="getTagClasses(tag)"
                  class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                >
                  {{ tag }}
                </span>
              </div>

              <!-- Perks - DIM-style matrix -->
              <WishlistPerkMatrix
                :weapon-hash="weaponHash"
                :perk-hashes="item.perkHashes"
                class="mb-2"
              />

              <!-- Notes -->
              <p v-if="item.notes" class="text-xs text-gray-500 line-clamp-3">
                {{ item.notes }}
              </p>

              <!-- Action buttons for editable wishlists (user OR admin-editable presets) -->
              <div v-if="isEditable" class="mt-2 flex gap-3">
                <button
                  @click="handleEditItem(item, weaponHash)"
                  class="text-xs text-blue-400 hover:text-blue-300"
                >
                  Edit
                </button>
                <button
                  @click="handleDeleteItem(item.id)"
                  class="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty search results -->
      <div v-if="filteredGroups.length === 0 && searchQuery" class="text-center py-12">
        <p class="text-gray-400">No items match "{{ searchQuery }}"</p>
      </div>

      <!-- Empty wishlist -->
      <div v-if="wishlist.items.length === 0" class="text-center py-12">
        <p class="text-gray-400">This wishlist is empty.</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWishlistsStore } from '@/stores/wishlists'
import { manifestService } from '@/services/manifest-service'
import { getWishlistStats } from '@/services/dim-wishlist-parser'
import WishlistPerkMatrix from '@/components/wishlists/WishlistPerkMatrix.vue'
import type { WishlistItem, WishlistTag } from '@/models/wishlist'
import { isWishlistEditable } from '@/utils/admin'

const route = useRoute()
const router = useRouter()
const wishlistsStore = useWishlistsStore()

const loading = ref(true)
const searchQuery = ref('')

// Get wishlist
const wishlist = computed(() => {
  const id = route.params.id as string
  return wishlistsStore.getWishlistById(id)
})

// Stats
const stats = computed(() => {
  if (!wishlist.value) return { itemCount: 0, weaponCount: 0 }
  return getWishlistStats(wishlist.value.items)
})

// Admin mode - check if this wishlist is editable
const isEditable = computed(() => {
  if (!wishlist.value) return false
  return isWishlistEditable(wishlist.value)
})

// Check if there are unsaved local changes (for admin-edited presets)
const hasUnsavedChanges = computed(() => {
  if (!wishlist.value) return false
  return wishlistsStore.hasLocalChanges(wishlist.value.id)
})

// Group items by weapon
const groupedByWeapon = computed(() => {
  if (!wishlist.value) return new Map<number, WishlistItem[]>()

  const groups = new Map<number, WishlistItem[]>()
  for (const item of wishlist.value.items) {
    const existing = groups.get(item.weaponHash) || []
    existing.push(item)
    groups.set(item.weaponHash, existing)
  }
  return groups
})

// Filter by search
const filteredGroups = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) {
    return Array.from(groupedByWeapon.value.entries())
  }

  return Array.from(groupedByWeapon.value.entries()).filter(([weaponHash, items]) => {
    const weaponName = getWeaponName(weaponHash).toLowerCase()
    if (weaponName.includes(query)) return true

    // Check item notes
    return items.some((item) => item.notes?.toLowerCase().includes(query))
  })
})

// Initialize
onMounted(async () => {
  if (!wishlistsStore.initialized) {
    await wishlistsStore.initialize()
  }
  loading.value = false
})

// Helpers
function getWeaponName(hash: number): string {
  const def = manifestService.getInventoryItem(hash)
  return def?.displayProperties?.name || `Unknown (${hash})`
}

function getWeaponIcon(hash: number): string | null {
  const def = manifestService.getInventoryItem(hash)
  return def?.displayProperties?.icon || null
}

function formatDate(isoString?: string): string {
  if (!isoString) return 'Unknown'
  const date = new Date(isoString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getTagClasses(tag: WishlistTag): string {
  switch (tag) {
    case 'pvp':
      return 'bg-red-900/50 text-red-300 border border-red-700/50'
    case 'pve':
      return 'bg-green-900/50 text-green-300 border border-green-700/50'
    case 'godroll':
      return 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
    case 'mkb':
      return 'bg-purple-900/50 text-purple-300 border border-purple-700/50'
    case 'controller':
      return 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
    case 'trash':
      return 'bg-gray-900/50 text-gray-400 border border-gray-700/50'
    default:
      return 'bg-gray-900/50 text-gray-400 border border-gray-700/50'
  }
}

// Actions
function handleExport() {
  if (!wishlist.value) return

  const content = wishlistsStore.exportToDimFormat(wishlist.value.id)
  if (!content) return

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${wishlist.value.name.replace(/[^a-z0-9]/gi, '_')}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function handleDeleteItem(itemId: string) {
  if (!wishlist.value) return

  if (wishlist.value.sourceType === 'user') {
    wishlistsStore.removeItemFromWishlist(wishlist.value.id, itemId)
  } else if (wishlist.value.sourceType === 'preset') {
    // Admin mode - remove from preset
    wishlistsStore.removeItemFromPreset(wishlist.value.id, itemId)
  }
}

function handleExportAndMarkSaved() {
  if (!wishlist.value) return

  const content = wishlistsStore.exportToDimFormat(wishlist.value.id)
  if (!content) return

  // Download file
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${wishlist.value.name.replace(/[^a-z0-9]/gi, '_')}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  // Mark changes as saved
  wishlistsStore.markChangesSaved(wishlist.value.id)
}

function handleEditItem(item: WishlistItem, weaponHash: number) {
  if (!wishlist.value) return
  // Navigate to weapon detail page with edit params
  router.push({
    name: 'weapon-detail',
    params: { weaponHash: weaponHash.toString() },
    query: {
      tab: 'editrolls',
      editItemId: item.id,
      wishlistId: wishlist.value.id
    }
  })
}
</script>
