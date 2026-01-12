<template>
  <div class="rounded-xl border border-gray-700 bg-gray-800 p-5 shadow-sm hover:border-gray-600 transition-colors">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
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
            v-if="hasUpdate"
            class="inline-flex items-center rounded-full bg-amber-900/50 text-amber-300 border border-amber-700/50 px-2 py-0.5 text-xs font-medium"
          >
            Update Available
          </span>
        </div>
        <p v-if="wishlist.description" class="mt-1 text-sm text-gray-400 line-clamp-2">
          {{ wishlist.description }}
        </p>
        <p v-if="wishlist.author" class="mt-1 text-xs text-gray-500">
          by {{ wishlist.author }}
        </p>
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
      <router-link
        :to="{ name: 'wishlist-detail', params: { id: wishlist.id } }"
        class="inline-flex items-center rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-200 hover:bg-gray-600 transition-colors"
      >
        View
      </router-link>

      <button
        v-if="wishlist.sourceType === 'preset'"
        @click="$emit('fork', wishlist)"
        class="inline-flex items-center rounded-lg bg-blue-600/30 px-3 py-1.5 text-sm font-medium text-blue-300 hover:bg-blue-600/40 transition-colors"
      >
        Fork
      </button>

      <button
        v-if="wishlist.sourceType === 'preset' && hasUpdate"
        @click="$emit('refresh', wishlist)"
        class="inline-flex items-center rounded-lg bg-amber-600/30 px-3 py-1.5 text-sm font-medium text-amber-300 hover:bg-amber-600/40 transition-colors"
      >
        Update
      </button>

      <button
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

const props = defineProps<{
  wishlist: Wishlist
  updateStatus?: WishlistUpdateStatus
}>()

defineEmits<{
  (e: 'fork', wishlist: Wishlist): void
  (e: 'refresh', wishlist: Wishlist): void
  (e: 'export', wishlist: Wishlist): void
  (e: 'delete', wishlist: Wishlist): void
}>()

const stats = computed(() => getWishlistStats(props.wishlist.items))

const hasUpdate = computed(
  () => props.updateStatus?.hasUpdate ?? false
)

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
