<template>
  <div
    class="group flex flex-col bg-surface-elevated border border-border hover:border-border-subtle rounded-lg p-3 transition-colors"
  >
    <!-- Header row: consolidation count + tags -->
    <div class="flex items-center mb-2 gap-2">
      <!-- Left: consolidation badge -->
      <span class="text-xs font-medium text-amber-500">
        {{ consolidated.originalCount }} roll{{ consolidated.originalCount > 1 ? 's' : '' }} consolidated
      </span>

      <!-- Right: tags (union of all) -->
      <div v-if="consolidated.tags?.length" class="flex flex-wrap gap-1 flex-1 justify-end">
        <span
          v-for="tag in sortedTags"
          :key="tag"
          :class="getTagDisplayClasses(tag)"
          :title="getTagTooltip(tag)"
          class="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <!-- Two-column layout: perk matrix left, notes right -->
    <div class="flex gap-3 items-start">
      <!-- Left: perk matrix with unified perks (never clipped) -->
      <div class="flex-shrink-0">
        <WishlistPerkMatrix
          :weapon-hash="weaponHash"
          :perk-hashes="consolidated.perkHashes"
        />
      </div>

      <!-- Right: notes (scrolls within max height ~8 perks ≈ 288px) -->
      <div
        v-if="consolidated.notes"
        class="flex-1 min-w-0 flex flex-col"
      >
        <!-- Summarized indicator when notes were deduplicated -->
        <span
          v-if="consolidated.originalNotesCount > 1"
          class="text-[10px] text-text-subtle italic mb-1"
          :title="`${consolidated.originalNotesCount} original notes combined and deduplicated`"
        >
          Summarized from {{ consolidated.originalNotesCount }} notes
        </span>
        <div
          class="text-xs text-text-muted overflow-y-auto max-h-72"
          :title="consolidated.notes"
        >
          {{ consolidated.notes }}
        </div>
      </div>
    </div>

    <!-- Footer: YouTube info + Apply action -->
    <div class="pt-2 flex items-center gap-2 text-xs">
      <!-- Left: YouTube info -->
      <div v-if="consolidated.primaryYoutube" class="text-text-subtle flex-1 min-w-0">
        <span v-if="consolidated.primaryYoutube.author" class="mr-1">
          {{ consolidated.primaryYoutube.author }}
        </span>
        <a
          :href="timestampedYoutubeUrl || consolidated.primaryYoutube.link"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-400 hover:text-blue-300 hover:underline"
          @click.stop
        >
          <template v-if="isYoutubeLink">YouTube<template v-if="consolidated.primaryYoutube.timestamp"> @ {{ consolidated.primaryYoutube.timestamp }}</template></template>
          <template v-else>Link</template>
        </a>
        <span v-if="consolidated.additionalYoutubeCount > 0" class="text-text-subtle ml-1">
          +{{ consolidated.additionalYoutubeCount }} more
        </span>
      </div>
      <div v-else class="flex-1"></div>

      <!-- Right: Action button -->
      <button
        @click="emit('action')"
        class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
      >
        {{ actionLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WishlistPerkMatrix from '@/components/wishlists/WishlistPerkMatrix.vue'
import { sortTagsForDisplay } from '@/utils/wishlist-sorting'
import { getTimestampedUrl, extractYouTubeVideoId } from '@/utils/youtube'
import { getTagDisplayClasses, getTagTooltip } from '@/utils/wishlist-tags'
import type { ConsolidatedWishlistItem } from '@/models/wishlist'

const props = withDefaults(defineProps<{
  /** The consolidated wishlist item data */
  consolidated: ConsolidatedWishlistItem
  /** Weapon hash for the perk matrix */
  weaponHash: number
  /** Name of the wishlist this item belongs to */
  wishlistName: string
  /** Label for the action button */
  actionLabel?: string
}>(), {
  actionLabel: 'Apply'
})

const emit = defineEmits<{
  action: []
}>()

// Computed values
const sortedTags = computed(() => sortTagsForDisplay(props.consolidated.tags))

const isYoutubeLink = computed(() => {
  if (!props.consolidated.primaryYoutube?.link) return false
  return extractYouTubeVideoId(props.consolidated.primaryYoutube.link) !== null
})

const timestampedYoutubeUrl = computed(() => {
  if (props.consolidated.primaryYoutube?.link && props.consolidated.primaryYoutube?.timestamp) {
    return getTimestampedUrl(props.consolidated.primaryYoutube.link, props.consolidated.primaryYoutube.timestamp)
  }
  return null
})

</script>
