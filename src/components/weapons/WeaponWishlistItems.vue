<template>
  <div v-if="wishlistResults.length > 0" class="space-y-3">
    <!-- Collapsible Header -->
    <button
      @click="isExpanded = !isExpanded"
      class="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 transition-colors group"
    >
      <div class="flex items-center gap-2">
        <h4 class="font-bold text-lg text-gray-200">Wishlist Recommendations</h4>
        <span class="text-xs px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-700/50">
          {{ totalItemCount }}
        </span>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 text-gray-400 transition-transform duration-200"
        :class="{ 'rotate-180': isExpanded }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Collapsible Content -->
    <div v-show="isExpanded" class="animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
      <!-- Group by wishlist source -->
      <div v-for="result in wishlistResults" :key="result.wishlist.id" class="space-y-2">
        <!-- Wishlist source header -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-300">{{ result.wishlist.name }}</span>
          <span
            :class="[
              'text-[10px] px-1.5 py-0.5 rounded-full',
              result.wishlist.sourceType === 'preset'
                ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                : 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
            ]"
          >
            {{ result.wishlist.sourceType === 'preset' ? 'Preset' : 'Custom' }}
          </span>
          <span v-if="result.wishlist.author" class="text-xs text-gray-500">
            by {{ result.wishlist.author }}
          </span>
        </div>

        <!-- Items grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <div
            v-for="item in result.items"
            :key="item.id"
            @click="$emit('loadItem', item, result.wishlist)"
            class="group bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-lg p-3 transition-colors cursor-pointer"
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

            <!-- Perks count -->
            <div class="text-xs text-gray-400">
              {{ item.perkHashes.length }} perks selected
            </div>

            <!-- Notes preview -->
            <p v-if="item.notes" class="mt-1 text-[10px] text-gray-500 line-clamp-2">
              {{ item.notes }}
            </p>

            <!-- Load action hint -->
            <div class="mt-2 text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to load in God Roll Creator
            </div>
          </div>
        </div>
      </div>

      <!-- Link to full wishlists page -->
      <div class="pt-2 border-t border-gray-700/50">
        <router-link
          to="/wishlists"
          class="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Manage all wishlists &rarr;
        </router-link>
      </div>
    </div>
  </div>

  <!-- Empty state - only if store is initialized -->
  <div v-else-if="store.initialized && !store.loading" class="text-sm text-gray-500 text-center py-4">
    No wishlist recommendations for this weapon.
    <router-link to="/wishlists" class="text-blue-400 hover:text-blue-300 ml-1">
      Browse wishlists
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistsStore } from '@/stores/wishlists'
import type { WishlistItem, Wishlist, WishlistTag } from '@/models/wishlist'

const props = defineProps<{
  weaponHash: number
}>()

defineEmits<{
  (e: 'loadItem', item: WishlistItem, wishlist: Wishlist): void
}>()

const store = useWishlistsStore()
const isExpanded = ref(true)

// Initialize store on mount
onMounted(async () => {
  if (!store.initialized) {
    await store.initialize()
  }
})

// Get wishlist items for this weapon
const wishlistResults = computed(() => {
  return store.getItemsForWeaponHash(props.weaponHash)
})

const totalItemCount = computed(() => {
  return wishlistResults.value.reduce((acc, r) => acc + r.items.length, 0)
})

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
</script>
