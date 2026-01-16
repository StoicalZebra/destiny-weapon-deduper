<template>
  <div class="relative flex-shrink-0 ml-0.5 w-8 h-8">
    <!-- Perk icon with ring indicator -->
    <div
      class="w-8 h-8 rounded-full overflow-hidden bg-perk-background"
      :class="ringClass"
    >
      <img
        v-if="iconPath"
        :src="`https://www.bungie.net${iconPath}`"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full bg-surface-overlay"></div>
    </div>

    <!-- Wishlist thumbs-up indicator (upper-right) -->
    <div
      v-if="showWishlist"
      :class="[INDICATOR_STYLES.wishlist, 'absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center shadow-lg']"
      :title="wishlistTooltip"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { INDICATOR_STYLES } from '@/styles/ui-states'

defineProps<{
  iconPath: string | null
  ringClass: string
  showWishlist?: boolean
  wishlistTooltip?: string
}>()
</script>
