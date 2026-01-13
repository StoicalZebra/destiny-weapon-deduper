<template>
  <div class="rounded-xl border border-gray-700 bg-gray-800 p-5 shadow-sm hover:border-gray-600 transition-colors">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="text-lg font-semibold truncate">{{ wishlist.name }}</h3>
          <span
            :class="[
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              wishlist.sourceType === 'preset'
                ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                : 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
            ]"
          >
            {{ wishlist.sourceType === 'preset' ? 'Preset' : 'Custom' }}
          </span>
          <span
            v-if="isAdminEditable"
            class="inline-flex items-center rounded-full bg-purple-900/50 text-purple-300 border border-purple-700/50 px-2 py-0.5 text-xs font-medium"
          >
            Admin Editable
          </span>
          <span
            v-if="hasLocalChanges"
            class="inline-flex items-center rounded-full bg-amber-900/50 text-amber-300 border border-amber-700/50 px-2 py-0.5 text-xs font-medium"
          >
            Unsaved Changes
          </span>
          <span
            v-if="hasUpdate && !hasLocalChanges"
            class="inline-flex items-center rounded-full bg-amber-900/50 text-amber-300 border border-amber-700/50 px-2 py-0.5 text-xs font-medium"
          >
            Update Available
          </span>
        </div>
        <p v-if="wishlist.description" class="mt-1 text-sm text-gray-400 line-clamp-2">
          {{ wishlist.description }}
        </p>
      </div>
      <!-- Author in upper right -->
      <div v-if="wishlist.author" class="text-sm text-gray-400 whitespace-nowrap">
        by {{ wishlist.author }}
      </div>
    </div>

    <!-- Stats -->
    <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div class="flex items-center justify-between rounded-lg bg-gray-900/40 px-3 py-2">
        <span class="text-gray-400">Items</span>
        <span class="font-semibold text-gray-200">{{ stats.itemCount.toLocaleString() }}</span>
      </div>
      <div class="flex items-center justify-between rounded-lg bg-gray-900/40 px-3 py-2">
        <span class="text-gray-400">Weapons</span>
        <span class="font-semibold text-gray-200">{{ stats.weaponCount.toLocaleString() }}</span>
      </div>
    </div>

    <!-- Last Updated -->
    <div v-if="wishlist.lastFetched || wishlist.lastUpdated" class="mt-3 text-xs text-gray-500">
      Last updated: {{ formatDate(wishlist.lastUpdated || wishlist.lastFetched) }}
    </div>

    <!-- Actions -->
    <div class="mt-4 flex flex-wrap gap-2">
      <!-- Admin-editable presets: Edit button (internal link) -->
      <router-link
        v-if="isAdminEditable"
        :to="{ name: 'wishlist-detail', params: { id: wishlist.id } }"
        class="inline-flex items-center rounded-lg bg-purple-600/30 px-3 py-1.5 text-sm font-medium text-purple-300 hover:bg-purple-600/40 transition-colors"
      >
        Edit
      </router-link>

      <!-- Preset wishlists: View on GitHub (external link) -->
      <a
        v-if="wishlist.sourceType === 'preset' && wishlist.sourceUrl"
        :href="wishlist.sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-200 hover:bg-gray-600 transition-colors"
      >
        View on GitHub
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>

      <!-- User wishlists: View (internal link) -->
      <router-link
        v-if="wishlist.sourceType === 'user'"
        :to="{ name: 'wishlist-detail', params: { id: wishlist.id } }"
        class="inline-flex items-center rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-200 hover:bg-gray-600 transition-colors"
      >
        View
      </router-link>

      <button
        v-if="wishlist.sourceType === 'preset' && hasUpdate"
        @click="$emit('refresh', wishlist)"
        class="inline-flex items-center rounded-lg bg-amber-600/30 px-3 py-1.5 text-sm font-medium text-amber-300 hover:bg-amber-600/40 transition-colors"
      >
        Update
      </button>

      <!-- Export for user wishlists and admin-editable presets -->
      <button
        v-if="wishlist.sourceType === 'user' || isAdminEditable"
        @click="$emit('export', wishlist)"
        class="inline-flex items-center rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-200 hover:bg-gray-600 transition-colors"
      >
        Export
      </button>

      <button
        v-if="wishlist.sourceType === 'user'"
        @click="$emit('delete', wishlist)"
        class="inline-flex items-center rounded-lg bg-red-600/30 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-600/40 transition-colors"
      >
        Delete
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Wishlist, WishlistUpdateStatus } from '@/models/wishlist'
import { getWishlistStats } from '@/services/dim-wishlist-parser'
import { isWishlistEditable } from '@/utils/admin'
import { useWishlistsStore } from '@/stores/wishlists'

const props = defineProps<{
  wishlist: Wishlist
  updateStatus?: WishlistUpdateStatus
}>()

const wishlistsStore = useWishlistsStore()

defineEmits<{
  (e: 'refresh', wishlist: Wishlist): void
  (e: 'export', wishlist: Wishlist): void
  (e: 'delete', wishlist: Wishlist): void
}>()

const stats = computed(() => getWishlistStats(props.wishlist.items))

const hasUpdate = computed(
  () => props.updateStatus?.hasUpdate ?? false
)

// Admin mode - check if this is an admin-editable preset
const isAdminEditable = computed(() => {
  return props.wishlist.sourceType === 'preset' && isWishlistEditable(props.wishlist)
})

// Check if there are unsaved local changes
const hasLocalChanges = computed(() => {
  return wishlistsStore.hasLocalChanges(props.wishlist.id)
})

function formatDate(isoString?: string): string {
  if (!isoString) return 'Unknown'
  const date = new Date(isoString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>
