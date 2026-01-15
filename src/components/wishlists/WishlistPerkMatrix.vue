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

interface WeaponSocketInfo {
  perkToColumn: Map<number, number>
  columnLabels: Map<number, string>
}

/**
 * Cache expensive socket scanning per weapon hash.
 * Only recalculates when weaponHash changes, not when perkHashes change.
 */
const weaponSocketInfo = computed((): WeaponSocketInfo | null => {
  const weaponDef = manifestService.getInventoryItem(props.weaponHash)
  if (!weaponDef?.sockets?.socketEntries) return null

  const perkToColumn = new Map<number, number>()
  const columnLabels = new Map<number, string>()
  const socketEntries = weaponDef.sockets.socketEntries

  // Scan sockets once to build perk-to-column mapping
  for (let socketIdx = 0; socketIdx < socketEntries.length; socketIdx++) {
    const socketEntry = socketEntries[socketIdx]
    if (!socketEntry) continue

    const plugHashes: number[] = []

    // Get perks from randomized and reusable plug sets
    if (socketEntry.randomizedPlugSetHash) {
      const plugSet = manifestService.getPlugSet(socketEntry.randomizedPlugSetHash)
      if (plugSet?.reusablePlugItems) {
        for (const item of plugSet.reusablePlugItems) {
          plugHashes.push(item.plugItemHash)
        }
      }
    }

    if (socketEntry.reusablePlugSetHash) {
      const plugSet = manifestService.getPlugSet(socketEntry.reusablePlugSetHash)
      if (plugSet?.reusablePlugItems) {
        for (const item of plugSet.reusablePlugItems) {
          if (!plugHashes.includes(item.plugItemHash)) {
            plugHashes.push(item.plugItemHash)
          }
        }
      }
    }

    if (socketEntry.singleInitialItemHash && !plugHashes.includes(socketEntry.singleInitialItemHash)) {
      plugHashes.push(socketEntry.singleInitialItemHash)
    }

    for (const hash of plugHashes) {
      if (!perkToColumn.has(hash)) {
        perkToColumn.set(hash, socketIdx)
      }
    }

    // Column labels
    let label = `Column ${socketIdx}`
    if (socketIdx === 1) label = 'Barrel'
    else if (socketIdx === 2) label = 'Magazine'
    else if (socketIdx === 3) label = 'Left Trait'
    else if (socketIdx === 4) label = 'Right Trait'
    else if (socketIdx === 5) label = 'Origin'
    columnLabels.set(socketIdx, label)
  }

  return { perkToColumn, columnLabels }
})

/**
 * Organize wishlist perks into columns using cached socket info.
 * Only the grouping logic runs when perkHashes change.
 */
const organizedPerks = computed((): PerkColumnDisplay[] => {
  const socketInfo = weaponSocketInfo.value

  // Fallback: no socket info, show perks in single column
  if (!socketInfo) {
    return props.perkHashes.length > 0
      ? [{ label: 'Perks', columnIndex: 0, perks: props.perkHashes }]
      : []
  }

  const { perkToColumn, columnLabels } = socketInfo

  // Group wishlist perks by their column (cheap operation)
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
