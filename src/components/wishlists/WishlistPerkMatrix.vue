<template>
  <div class="wishlist-perk-matrix">
    <!-- DIM-style perk columns layout -->
    <div class="flex gap-1.5">
      <!-- Each column is a vertical stack of perks -->
      <div
        v-for="(column, colIdx) in organizedPerks"
        :key="colIdx"
        class="flex flex-col gap-1"
        :title="column.label"
      >
        <PerkIcon
          v-for="perkHash in column.perks"
          :key="perkHash"
          :perk-hash="perkHash"
          size="md"
          variant="wishlist"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { manifestService } from '@/services/manifest-service'
import PerkIcon from '@/components/common/PerkIcon.vue'

const props = defineProps<{
  weaponHash: number
  perkHashes: number[]
}>()

// Organized perks by column
interface PerkColumnDisplay {
  label: string
  columnIndex: number
  perks: number[]
}

/**
 * Organize wishlist perks into columns based on weapon definition.
 * This maps flat perkHashes back to their socket column positions.
 */
const organizedPerks = computed((): PerkColumnDisplay[] => {
  const weaponDef = manifestService.getInventoryItem(props.weaponHash)
  if (!weaponDef?.sockets?.socketEntries) {
    // Fallback: just show perks in a single column
    return props.perkHashes.length > 0
      ? [{ label: 'Perks', columnIndex: 0, perks: props.perkHashes }]
      : []
  }

  // Build a map of perkHash -> columnIndex by scanning weapon sockets
  const perkToColumn = new Map<number, number>()
  const columnLabels = new Map<number, string>()

  const socketEntries = weaponDef.sockets.socketEntries

  // Determine column indices for main perk sockets (typically indices 1-4 for weapons)
  // Socket 0 is usually intrinsic, 1-2 are barrel/magazine, 3-4 are traits, 5+ are origin/mod
  for (let socketIdx = 0; socketIdx < socketEntries.length; socketIdx++) {
    const socketEntry = socketEntries[socketIdx]
    if (!socketEntry) continue

    // Get perks from randomized and reusable plug sets
    const randomPlugSetHash = socketEntry.randomizedPlugSetHash
    const reusablePlugSetHash = socketEntry.reusablePlugSetHash

    const plugHashes: number[] = []

    if (randomPlugSetHash) {
      const plugSet = manifestService.getPlugSet(randomPlugSetHash)
      if (plugSet?.reusablePlugItems) {
        for (const item of plugSet.reusablePlugItems) {
          plugHashes.push(item.plugItemHash)
        }
      }
    }

    if (reusablePlugSetHash) {
      const plugSet = manifestService.getPlugSet(reusablePlugSetHash)
      if (plugSet?.reusablePlugItems) {
        for (const item of plugSet.reusablePlugItems) {
          if (!plugHashes.includes(item.plugItemHash)) {
            plugHashes.push(item.plugItemHash)
          }
        }
      }
    }

    // Also check initial item
    if (socketEntry.singleInitialItemHash && !plugHashes.includes(socketEntry.singleInitialItemHash)) {
      plugHashes.push(socketEntry.singleInitialItemHash)
    }

    // Map each perk to this column
    for (const hash of plugHashes) {
      if (!perkToColumn.has(hash)) {
        perkToColumn.set(hash, socketIdx)
      }
    }

    // Determine column label based on socket index (simplified mapping)
    let label = `Column ${socketIdx}`
    if (socketIdx === 1) label = 'Barrel'
    else if (socketIdx === 2) label = 'Magazine'
    else if (socketIdx === 3) label = 'Left Trait'
    else if (socketIdx === 4) label = 'Right Trait'
    else if (socketIdx === 5) label = 'Origin'

    columnLabels.set(socketIdx, label)
  }

  // Group wishlist perks by their column
  const columnMap = new Map<number, number[]>()
  const unknownPerks: number[] = []

  for (const perkHash of props.perkHashes) {
    const colIdx = perkToColumn.get(perkHash)
    if (colIdx !== undefined) {
      const existing = columnMap.get(colIdx) || []
      existing.push(perkHash)
      columnMap.set(colIdx, existing)
    } else {
      unknownPerks.push(perkHash)
    }
  }

  // Build result array sorted by column index
  const result: PerkColumnDisplay[] = []
  const sortedColumns = Array.from(columnMap.keys()).sort((a, b) => a - b)

  for (const colIdx of sortedColumns) {
    const perks = columnMap.get(colIdx) || []
    result.push({
      label: columnLabels.get(colIdx) || `Column ${colIdx}`,
      columnIndex: colIdx,
      perks
    })
  }

  // Add any unknown perks at the end
  if (unknownPerks.length > 0) {
    result.push({
      label: 'Other',
      columnIndex: -1,
      perks: unknownPerks
    })
  }

  return result
})
</script>
