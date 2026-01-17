<template>
  <div class="rounded-xl border border-border bg-surface-elevated p-5 shadow-sm hover:border-border-subtle transition-colors h-full flex flex-col">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <!-- Left: Title, Author, Description -->
      <div class="min-w-0 flex-1">
        <h3 class="text-lg font-semibold text-text truncate">{{ wishlist.name }}</h3>
        <p v-if="wishlist.author" class="text-sm text-text-muted">
          by {{ wishlist.author }}
        </p>
        <p v-if="wishlist.description" class="mt-1 text-sm text-text-muted line-clamp-2">
          {{ wishlist.description }}
        </p>
      </div>

      <!-- Right: Updated date + all badges -->
      <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
        <!-- GitHub commit date for preset wishlists, local update date for custom -->
        <div v-if="wishlist.githubCommitDate && wishlist.sourceType === 'preset'" class="text-xs text-text-subtle whitespace-nowrap">
          Last commit: {{ formatDateShort(wishlist.githubCommitDate) }}
        </div>
        <div v-else-if="wishlist.lastFetched || wishlist.lastUpdated" class="text-xs text-text-subtle whitespace-nowrap">
          Updated: {{ formatDateShort(wishlist.lastUpdated || wishlist.lastFetched) }}
        </div>

        <!-- Badges row -->
        <div class="flex flex-wrap gap-1.5 justify-end">
          <!-- Large badge -->
          <span
            v-if="isLargePreset"
            class="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 px-2 py-0.5 text-xs font-medium"
          >
            Large
          </span>
          <!-- Premade/Custom badge -->
          <span
            :class="[
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              wishlist.sourceType === 'preset'
                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700/50'
                : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700/50'
            ]"
          >
            {{ wishlist.sourceType === 'preset' ? 'Premade' : 'Custom' }}
          </span>
          <!-- Update Available badge -->
          <span
            v-if="hasUpdate"
            class="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 px-2 py-0.5 text-xs font-medium"
          >
            Update Available
          </span>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="mt-4 grid grid-cols-2 gap-3 text-sm flex-grow">
      <div class="flex items-center justify-between rounded-lg bg-surface/40 px-3 py-2 h-fit">
        <span class="text-text-muted">Rolls</span>
        <span class="font-semibold text-text">{{ stats.itemCount.toLocaleString() }}</span>
      </div>
      <div class="flex items-center justify-between rounded-lg bg-surface/40 px-3 py-2 h-fit">
        <span class="text-text-muted">Weapons</span>
        <span class="font-semibold text-text">{{ stats.weaponCount.toLocaleString() }}</span>
      </div>
    </div>

    <!-- Actions - always at bottom -->
    <div class="mt-4 pt-3 border-t border-border/50">
      <!-- Large wishlists: show View button + GitHub link -->
      <div v-if="isTooLarge" class="text-sm text-text-muted space-y-3">
        <p>
          <span class="text-text font-medium">{{ stats.itemCount.toLocaleString() }} rolls</span>
          — too large for in-app editing (limit: {{ MAX_EDITABLE_ROLLS }})
        </p>
        <div class="flex flex-wrap items-center gap-2 justify-end">
          <!-- View button to browse the wishlist -->
          <router-link
            :to="{ name: 'wishlist-detail', params: { id: wishlist.id } }"
            class="inline-flex items-center rounded-lg bg-purple-100 dark:bg-purple-600/30 px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-600/40 transition-colors"
          >
            View
          </router-link>
          <a
            v-if="wishlist.sourceUrl"
            :href="wishlist.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Fork on GitHub
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <!-- Unload button for large presets (to free storage) -->
          <button
            v-if="wishlist.sourceType === 'preset' && isLargePreset"
            @click="$emit('unload', wishlist)"
            class="inline-flex items-center rounded-lg bg-red-100 dark:bg-red-600/30 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-600/40 transition-colors"
          >
            Unload
          </button>
        </div>
      </div>

      <!-- Normal size wishlists: show full action buttons -->
      <div v-else class="flex flex-wrap gap-2 justify-end">
        <!-- View/Edit button for all editable wishlists -->
        <router-link
          :to="{ name: 'wishlist-detail', params: { id: wishlist.id } }"
          :class="[
            'inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            wishlist.sourceType === 'preset'
              ? 'bg-purple-100 dark:bg-purple-600/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-600/40'
              : 'bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-600/40'
          ]"
        >
          {{ wishlist.sourceType === 'preset' ? 'View / Fork' : 'View / Edit' }}
        </router-link>

        <!-- Preset wishlists: View on GitHub (external link) -->
        <a
          v-if="wishlist.sourceType === 'preset' && wishlist.sourceUrl"
          :href="wishlist.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 rounded-lg bg-surface-overlay px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-elevated transition-colors"
        >
          GitHub
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        <button
          v-if="wishlist.sourceType === 'preset' && hasUpdate"
          @click="$emit('refresh', wishlist)"
          class="inline-flex items-center rounded-lg bg-amber-100 dark:bg-amber-600/30 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-600/40 transition-colors"
        >
          Update
        </button>

        <!-- Export for all editable wishlists -->
        <button
          @click="$emit('export', wishlist)"
          class="inline-flex items-center rounded-lg bg-surface-overlay px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-elevated transition-colors"
        >
          Export
        </button>

        <!-- Unload button for large presets (to free storage) -->
        <button
          v-if="wishlist.sourceType === 'preset' && isLargePreset"
          @click="$emit('unload', wishlist)"
          class="inline-flex items-center rounded-lg bg-red-100 dark:bg-red-600/30 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-600/40 transition-colors"
        >
          Unload
        </button>

        <button
          v-if="wishlist.sourceType === 'user'"
          @click="$emit('delete', wishlist)"
          class="inline-flex items-center rounded-lg bg-red-100 dark:bg-red-600/30 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-600/40 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Wishlist, WishlistUpdateStatus } from '@/models/wishlist'
import { MAX_EDITABLE_ROLLS } from '@/models/wishlist'
import { getWishlistStats } from '@/services/dim-wishlist-parser'
import { isWishlistTooLarge } from '@/utils/admin'

const props = defineProps<{
  wishlist: Wishlist
  updateStatus?: WishlistUpdateStatus
  isLargePreset?: boolean
}>()

defineEmits<{
  (e: 'refresh', wishlist: Wishlist): void
  (e: 'export', wishlist: Wishlist): void
  (e: 'delete', wishlist: Wishlist): void
  (e: 'unload', wishlist: Wishlist): void
}>()

const stats = computed(() => getWishlistStats(props.wishlist.items))

const hasUpdate = computed(
  () => props.updateStatus?.hasUpdate ?? false
)

// Check if wishlist is too large for in-app editing
const isTooLarge = computed(() => isWishlistTooLarge(props.wishlist))

function formatDateShort(isoString?: string): string {
  if (!isoString) return 'Unknown'
  const date = new Date(isoString)
  // Format as yyyy-mm-dd
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>
