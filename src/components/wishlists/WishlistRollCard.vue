<template>
  <div
    class="group flex flex-col bg-surface-elevated border border-border hover:border-border-subtle rounded-lg p-3 transition-colors"
    :class="[
      clickable ? 'cursor-pointer' : '',
      isActive ? 'ring-2 ring-blue-500/50 border-blue-500/50 bg-blue-900/10' : ''
    ]"
    @click="handleClick"
  >
    <!-- Header row: left=wishlist name, center=perks, right=tags+delete -->
    <div class="flex items-center mb-2 gap-2">
      <!-- Left: wishlist name -->
      <span class="text-xs font-medium text-text-muted truncate min-w-0 flex-1" :title="wishlistName">
        {{ wishlistName }}
      </span>

      <!-- Center: perks count -->
      <span class="text-xs text-text-subtle flex-shrink-0">
        {{ item.perkHashes.length }} perks
      </span>

      <!-- Right: tags + optional header actions slot -->
      <div class="flex items-center gap-2 flex-1 justify-end">
        <!-- Tags -->
        <div v-if="item.tags?.length" class="flex flex-wrap gap-1 justify-end">
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
        <!-- Slot for custom header actions (e.g., inline delete button) -->
        <slot name="header-actions"></slot>
      </div>
    </div>

    <!-- Two-column layout: perk matrix left, notes right -->
    <div class="flex gap-3 items-stretch">
      <!-- Left: perk matrix -->
      <div class="flex-shrink-0">
        <WishlistPerkMatrix
          :weapon-hash="weaponHash"
          :perk-hashes="item.perkHashes"
        />
      </div>

      <!-- Right: notes (if any) - full height column -->
      <div
        v-if="item.notes"
        class="text-xs text-text-muted flex-1 min-w-0 overflow-y-auto max-h-32"
        :title="item.notes"
      >
        {{ item.notes }}
      </div>
    </div>

    <!-- Bottom row: YouTube left, Metadata center, Actions right (anchored to bottom) -->
    <!-- Uses same flex-1 pattern as header row for true centering -->
    <div v-if="hasBottomRowContent" class="mt-auto pt-2 flex items-center gap-2 text-xs">
      <!-- Left: YouTube info - flex-1 to balance right side -->
      <div class="text-text-subtle flex-1 min-w-0">
        <span v-if="item.youtubeLink || item.youtubeAuthor">
          <span v-if="item.youtubeAuthor" class="mr-1">{{ item.youtubeAuthor }}</span>
          <a
            v-if="item.youtubeLink"
            :href="timestampedYoutubeUrl || item.youtubeLink"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-400 hover:text-blue-300 hover:underline"
            @click.stop
          ><template v-if="isYoutubeLink">YouTube<template v-if="item.youtubeTimestamp"> @ {{ item.youtubeTimestamp }}</template></template><template v-else>Link</template></a>
          <span v-else-if="item.youtubeTimestamp">@ {{ item.youtubeTimestamp }}</span>
        </span>
      </div>

      <!-- Center: Updated date (with createdBy in tooltip) - flex-shrink-0 to stay centered -->
      <span v-if="formattedUpdatedAt" class="flex-shrink-0 text-text-subtle" :title="item.createdBy ? `by ${item.createdBy}` : undefined">
        {{ formattedUpdatedAt }}
      </span>

      <!-- Right: Action links - flex-1 to balance left side -->
      <div class="flex-1 flex justify-end gap-3" @click.stop>
        <!-- View-only for premade wishlists -->
        <button
          v-if="showViewOnly && !showActions"
          @click.stop="emit('view')"
          class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
        >
          View
        </button>
        <!-- Full actions for user wishlists -->
        <template v-if="showActions">
          <button
            @click.stop="emit('view')"
            class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
          >
            View
          </button>
          <button
            @click.stop="emit('edit')"
            class="text-accent-primary hover:text-accent-primary/80"
          >
            Edit
          </button>
          <button
            @click.stop="emit('remove')"
            class="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
          >
            Delete
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WishlistPerkMatrix from '@/components/wishlists/WishlistPerkMatrix.vue'
import { sortTagsForDisplay } from '@/utils/wishlist-sorting'
import { getTimestampedUrl, extractYouTubeVideoId } from '@/utils/youtube'
import { getTagDisplayClasses, getTagTooltip } from '@/utils/wishlist-tags'
import type { WishlistItem } from '@/models/wishlist'

const props = withDefaults(defineProps<{
  /** The wishlist item data */
  item: WishlistItem
  /** Weapon hash for the perk matrix */
  weaponHash: number
  /** Name of the wishlist this item belongs to */
  wishlistName: string
  /** Whether the card should be clickable */
  clickable?: boolean
  /** Whether this card is currently active/selected */
  isActive?: boolean
  /** Show View/Edit/Remove action links (for user wishlists) */
  showActions?: boolean
  /** Show only View action link (for premade wishlists) */
  showViewOnly?: boolean
}>(), {
  clickable: false,
  isActive: false,
  showActions: false,
  showViewOnly: false
})

const emit = defineEmits<{
  click: []
  view: []
  edit: []
  remove: []
}>()

// Computed values
const sortedTags = computed(() => sortTagsForDisplay(props.item.tags))

const isYoutubeLink = computed(() => {
  if (!props.item.youtubeLink) return false
  return extractYouTubeVideoId(props.item.youtubeLink) !== null
})

const timestampedYoutubeUrl = computed(() => {
  if (props.item.youtubeLink && props.item.youtubeTimestamp) {
    return getTimestampedUrl(props.item.youtubeLink, props.item.youtubeTimestamp)
  }
  return null
})

// Format updatedAt for display (e.g., "Jan 16" or "Jan 16, 2025" if not current year)
const formattedUpdatedAt = computed(() => {
  if (!props.item.updatedAt) return null
  const date = new Date(props.item.updatedAt)
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' })
  })
})

// Check if bottom row should be shown
const hasBottomRowContent = computed(() =>
  props.item.youtubeLink ||
  props.item.youtubeAuthor ||
  props.item.updatedAt ||
  props.showActions ||
  props.showViewOnly
)

// Handlers
function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}

</script>
