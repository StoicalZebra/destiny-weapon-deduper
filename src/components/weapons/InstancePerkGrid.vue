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
          <!-- Badge slot: wishlist indicator (top-right) -->
          <template #badge v-if="isWishlistPerk(perkHash)">
            <!-- Wishlist thumbs-up indicator badge (top-right) -->
            <div
              :class="[INDICATOR_STYLES.wishlist, 'absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center shadow-lg']"
              :title="getWishlistBadgeTooltip(props.wishlistPerkAnnotations?.get(perkHash))"
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
    <div v-if="masterworkInfo" class="mt-1.5 flex items-center gap-1.5" :title="masterworkStatName">
      <div :class="[MASTERWORK_ICON_STYLES.container, MASTERWORK_ICON_STYLES.ring]">
        <img
          v-if="masterworkInfo.icon"
          :src="`https://www.bungie.net${masterworkInfo.icon}`"
          :class="MASTERWORK_ICON_STYLES.image"
          :alt="masterworkStatName"
        />
      </div>
      <span class="text-xs text-text-muted truncate">MW: {{ masterworkStatName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WeaponInstance } from '@/models/weapon-instance'
import type { PerkColumn } from '@/models/deduped-weapon'
import { manifestService } from '@/services/manifest-service'
import { getInstanceMasterwork } from '@/services/deduplication'
import { getWishlistBadgeTooltip, formatWishlistTooltipSuffix } from '@/utils/tooltip-helpers'
import PerkIcon from '@/components/common/PerkIcon.vue'
import { INDICATOR_STYLES, MASTERWORK_ICON_STYLES } from '@/styles/ui-states'
import { formatMasterworkStatName } from '@/utils/formatting'

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

// Strip prefixes from masterwork name to get just the stat name
const masterworkStatName = computed(() => {
  return formatMasterworkStatName(masterworkInfo.value?.name || '')
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

// Build full tooltip for perk icon (name + description + wishlist info)
function getTooltip(perkHash: number): string {
  const def = manifestService.getInventoryItem(perkHash)
  const name = def?.displayProperties?.name || 'Unknown'
  const desc = def?.displayProperties?.description || ''
  const wishlistSuffix = formatWishlistTooltipSuffix(props.wishlistPerkAnnotations?.get(perkHash))

  let tooltip = name
  if (desc) tooltip += `\n${desc}`
  tooltip += wishlistSuffix

  return tooltip
}
</script>
