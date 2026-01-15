<template>
  <div class="instance-perk-grid">
    <!-- Perk grid - DIM-style columns layout -->
    <div class="flex gap-1">
      <!-- Each column is a vertical stack -->
      <div
        v-for="(column, colIdx) in organizedPerks"
        :key="colIdx"
        class="flex flex-col items-center gap-1 min-w-0 flex-1"
      >
        <PerkIcon
          v-for="perkHash in column"
          :key="perkHash"
          :perk-hash="perkHash"
          size="md"
          :variant="getPerkVariant(perkHash)"
          :custom-tooltip="getTooltip(perkHash)"
        >
          <!-- Wishlist thumbs-up indicator badge -->
          <template #badge v-if="isWishlistPerk(perkHash)">
            <div
              :class="[INDICATOR_STYLES.wishlist, 'absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center shadow-lg']"
              :title="getWishlistTooltip(perkHash)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
            </div>
          </template>
        </PerkIcon>
      </div>
    </div>

    <!-- Masterwork indicator -->
    <div v-if="masterworkInfo" class="mt-1.5 flex items-center gap-1.5" :title="masterworkInfo.name">
      <div class="relative">
        <div
          class="w-5 h-5 rounded-full overflow-hidden bg-perk-background ring-1"
          :class="masterworkInfo.isEnhanced ? 'ring-amber-500' : 'ring-yellow-600'"
        >
          <img
            v-if="masterworkInfo.icon"
            :src="`https://www.bungie.net${masterworkInfo.icon}`"
            class="w-full h-full object-cover"
            :alt="masterworkInfo.name"
          />
        </div>
        <!-- Enhanced badge -->
        <div
          v-if="masterworkInfo.isEnhanced"
          class="absolute -top-0.5 -left-0.5 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center"
          title="Enhanced Masterwork"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-2 w-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </div>
      </div>
      <span class="text-xs text-text-muted truncate">Masterwork: {{ masterworkStatName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WeaponInstance } from '@/models/weapon-instance'
import type { PerkColumn } from '@/models/deduped-weapon'
import { manifestService } from '@/services/manifest-service'
import { getInstanceMasterwork } from '@/services/deduplication'
import PerkIcon from '@/components/common/PerkIcon.vue'
import { INDICATOR_STYLES } from '@/styles/ui-states'

const props = defineProps<{
  instance: WeaponInstance
  perkMatrix: PerkColumn[]
  masterworkSocketIndex?: number
  wishlistPerkAnnotations?: Map<number, string[]> // perkHash -> wishlist names
  highlightedPerks?: Set<number> // perks to highlight (from god roll selection)
}>()

// Get masterwork info for this instance
const masterworkInfo = computed(() =>
  getInstanceMasterwork(props.instance, props.masterworkSocketIndex)
)

// Strip "Tier X: " prefix from masterwork name to get just the stat name
const masterworkStatName = computed(() => {
  const name = masterworkInfo.value?.name || ''
  // Remove "Tier X: " prefix (e.g., "Tier 3: Stability" -> "Stability")
  return name.replace(/^Tier\s+\d+:\s*/i, '')
})

// Get all perks for this instance organized by column
const organizedPerks = computed(() => {
  const columns: number[][] = []

  for (const col of props.perkMatrix) {
    const perksInColumn: number[] = []

    // Get active perk
    const socket = props.instance.sockets.sockets[col.columnIndex]
    if (socket?.plugHash) {
      perksInColumn.push(socket.plugHash)
    }

    // Get reusable perks (alternatives available on this instance)
    const reusables = props.instance.socketPlugsByIndex?.[col.columnIndex] || []
    for (const hash of reusables) {
      if (!perksInColumn.includes(hash)) {
        perksInColumn.push(hash)
      }
    }

    if (perksInColumn.length > 0) {
      columns.push(perksInColumn)
    }
  }

  return columns
})

// Determine variant based on highlight state
function getPerkVariant(perkHash: number): 'selected' | 'default' {
  if (props.highlightedPerks?.has(perkHash)) {
    return 'selected'  // Blue ring for matching perks
  }
  // Use default (white ring) to match Perk Matrix styling
  return 'default'
}

// Check if perk is in wishlist recommendations
function isWishlistPerk(perkHash: number): boolean {
  return props.wishlistPerkAnnotations?.has(perkHash) ?? false
}

// Get wishlist names that recommend this perk
function getWishlistTooltip(perkHash: number): string {
  const wishlists = props.wishlistPerkAnnotations?.get(perkHash)
  if (!wishlists || wishlists.length === 0) return ''
  return `Recommended by: ${wishlists.join(', ')}`
}

// Get perk name from manifest
function getPerkName(perkHash: number): string {
  const def = manifestService.getInventoryItem(perkHash)
  return def?.displayProperties?.name || 'Unknown'
}

// Get perk description from manifest
function getPerkDescription(perkHash: number): string {
  const def = manifestService.getInventoryItem(perkHash)
  return def?.displayProperties?.description || ''
}

// Build full tooltip (including wishlist info)
function getTooltip(perkHash: number): string {
  const name = getPerkName(perkHash)
  const desc = getPerkDescription(perkHash)
  const wishlistInfo = getWishlistTooltip(perkHash)

  let tooltip = name
  if (desc) tooltip += `\n${desc}`
  if (wishlistInfo) tooltip += `\n\n${wishlistInfo}`

  return tooltip
}
</script>
