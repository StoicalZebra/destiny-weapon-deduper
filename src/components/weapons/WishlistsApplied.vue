<template>
  <div class="space-y-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h4 class="font-bold text-lg text-text">Wishlists Applied</h4>
      <span class="text-xs text-text-subtle">
        {{ enabledCount }} of {{ totalCount }} active
      </span>
    </div>

    <!-- Wishlist cards grid -->
    <div v-if="wishlistsWithCounts.length > 0" class="grid grid-cols-3 gap-2">
      <div
        v-for="{ wishlist, itemCount } in wishlistsWithCounts"
        :key="wishlist.id"
        class="flex flex-col gap-1 p-2 rounded-lg border transition-colors cursor-pointer"
        :class="isEnabled(wishlist)
          ? 'bg-surface-elevated/50 border-border hover:bg-surface-elevated'
          : 'bg-surface/30 border-border-subtle opacity-60'"
        @click="toggleWishlist(wishlist)"
      >
        <!-- Top row: checkbox + name -->
        <div class="flex items-center gap-1.5">
          <input
            type="checkbox"
            :checked="isEnabled(wishlist)"
            @click.stop
            @change="toggleWishlist(wishlist)"
            class="w-3 h-3 rounded border-border bg-surface-overlay text-green-500 focus:ring-green-500 focus:ring-offset-surface cursor-pointer flex-shrink-0"
          />
          <span class="font-medium text-xs truncate" :class="isEnabled(wishlist) ? 'text-text' : 'text-text-muted'">
            {{ wishlist.name }}
          </span>
        </div>

        <!-- Bottom row: roll count + source type badge -->
        <div class="flex items-center justify-between text-xs">
          <span class="text-text-subtle">{{ itemCount }} {{ itemCount === 1 ? 'roll' : 'rolls' }}</span>
          <span
            :class="[
              'inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium border',
              wishlist.sourceType === 'preset'
                ? 'bg-green-900/50 text-green-300 border-green-700/50'
                : 'bg-blue-900/50 text-blue-300 border-blue-700/50'
            ]"
          >
            {{ wishlist.sourceType === 'preset' ? 'Preset' : 'Custom' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-sm text-text-subtle text-center py-4">
      No wishlists available.
      <router-link to="/wishlists" class="text-accent-primary hover:text-accent-primary/80 ml-1">
        Browse wishlists
      </router-link>
    </div>

    <!-- Link to manage wishlists -->
    <div v-if="wishlistsWithCounts.length > 0" class="pt-2 border-t border-border/50">
      <router-link
        to="/wishlists"
        class="text-sm text-accent-primary hover:text-accent-primary/80 transition-colors"
      >
        Manage wishlists &rarr;
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useWishlistsStore } from '@/stores/wishlists'
import { getItemsForWeapon } from '@/services/dim-wishlist-parser'
import type { Wishlist } from '@/models/wishlist'

const props = defineProps<{
  weaponHash: number
}>()

const store = useWishlistsStore()

// Initialize store on mount
onMounted(async () => {
  if (!store.initialized) {
    await store.initialize(false)
  }
})

// Get all wishlists with their item counts for this weapon
const wishlistsWithCounts = computed(() => {
  return store.allWishlists
    .map(wishlist => ({
      wishlist,
      itemCount: getItemsForWeapon(wishlist.items, props.weaponHash).length
    }))
    .filter(({ itemCount }) => itemCount > 0)
    .sort((a, b) => {
      // Sort: enabled first, then by item count
      const aEnabled = isEnabled(a.wishlist) ? 1 : 0
      const bEnabled = isEnabled(b.wishlist) ? 1 : 0
      if (aEnabled !== bEnabled) return bEnabled - aEnabled
      return b.itemCount - a.itemCount
    })
})

// Count enabled vs total
const totalCount = computed(() => wishlistsWithCounts.value.length)
const enabledCount = computed(() =>
  wishlistsWithCounts.value.filter(({ wishlist }) => isEnabled(wishlist)).length
)

// Check if wishlist is enabled (uses store's reactive Map for instant updates)
function isEnabled(wishlist: Wishlist): boolean {
  return store.isWishlistEnabled(wishlist.id)
}

// Toggle wishlist enabled state
function toggleWishlist(wishlist: Wishlist): void {
  store.setWishlistEnabled(wishlist.id, !isEnabled(wishlist))
}
</script>
