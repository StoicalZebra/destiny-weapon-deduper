<template>
  <div>
    <div v-if="columns.length === 0" class="rounded-lg border border-dashed border-gray-700 p-6 text-center text-sm text-gray-500">
      Perk data not available yet for this weapon.
    </div>
    <div v-else class="overflow-x-auto overflow-y-visible">
      <div
        class="grid gap-3 overflow-visible"
        :style="{ gridTemplateColumns: `repeat(${columns.length}, minmax(160px, 1fr))` }"
      >
        <PerkColumn
          v-for="column in columns"
          :key="column.columnIndex"
          :column="column"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PerkColumn as PerkColumnModel } from '@/models/deduped-weapon'
import PerkColumn from './PerkColumn.vue'

defineProps<{
  columns: PerkColumnModel[]
}>()
</script>
