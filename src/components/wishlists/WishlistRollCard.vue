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
        class="text-xs text-text-muted flex-1 min-w-0 overflow-y-auto max-h-32 cursor-help"
        :title="item.notes"
      >
        {{ item.notes }}
      </div>
    </div>

    <!-- Bottom row: Creator/YouTube left, Actions right (anchored to bottom) -->
    <div v-if="(item.youtubeLink || item.youtubeAuthor) || showActions" class="mt-auto pt-2 flex items-center justify-between gap-2 text-xs">
      <!-- Left: Creator and YouTube Reference -->
      <div v-if="item.youtubeLink || item.youtubeAuthor" class="text-text-subtle">
        <span v-if="item.youtubeAuthor" class="mr-1">{{ item.youtubeAuthor }}</span>
        <a
          v-if="item.youtubeLink"
          :href="timestampedYoutubeUrl || item.youtubeLink"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-400 hover:text-blue-300 hover:underline"
          @click.stop
        >YouTube<template v-if="item.youtubeTimestamp"> @ {{ item.youtubeTimestamp }}</template></a>
        <span v-else-if="item.youtubeTimestamp">@ {{ item.youtubeTimestamp }}</span>
      </div>
      <!-- Spacer if no youtube info but actions exist -->
      <div v-else></div>

      <!-- Right: Action links (for editable wishlists) -->
      <div v-if="showActions" class="flex gap-3" @click.stop>
        <button
          @click="emit('view')"
          class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
        >
          View
        </button>
        <button
          @click="emit('edit')"
          class="text-accent-primary hover:text-accent-primary/80"
        >
          Edit
        </button>
        <button
          @click="emit('remove')"
          class="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
        >
          Remove
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WishlistPerkMatrix from '@/components/wishlists/WishlistPerkMatrix.vue'
import { sortTagsForDisplay } from '@/utils/wishlist-sorting'
import { getTimestampedUrl } from '@/utils/youtube'
import { TAG_DISPLAY_STYLES, TAG_TOOLTIPS } from '@/styles/ui-states'
import type { WishlistItem, WishlistTag } from '@/models/wishlist'

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
  /** Show View/Edit/Remove action links */
  showActions?: boolean
}>(), {
  clickable: false,
  isActive: false,
  showActions: false
})

const emit = defineEmits<{
  click: []
  view: []
  edit: []
  remove: []
}>()

// Computed values
const sortedTags = computed(() => sortTagsForDisplay(props.item.tags))

const timestampedYoutubeUrl = computed(() => {
  if (props.item.youtubeLink && props.item.youtubeTimestamp) {
    return getTimestampedUrl(props.item.youtubeLink, props.item.youtubeTimestamp)
  }
  return null
})

// Handlers
function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}

// Tag styling helpers
function getTagDisplayClasses(tag: WishlistTag): string {
  if (tag === 'pve') return TAG_DISPLAY_STYLES.pve
  if (tag === 'pvp') return TAG_DISPLAY_STYLES.pvp
  return TAG_DISPLAY_STYLES.default
}

function getTagTooltip(tag: WishlistTag): string {
  return TAG_TOOLTIPS[tag] || tag
}
</script>
