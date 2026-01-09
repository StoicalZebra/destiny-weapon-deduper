<template>
  <div class="rounded-lg border border-gray-700 bg-gray-800/60 p-3 overflow-visible">
    <div class="flex items-center justify-between">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-300">
        {{ column.columnName || 'Perks' }}
      </h4>
      <span class="text-xs text-gray-500">
        {{ ownedCount }}/{{ column.availablePerks.length }}
      </span>
    </div>

    <div class="mt-3 space-y-2">
      <PerkCell
        v-for="perk in column.availablePerks"
        :key="perk.hash"
        :perk="perk"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PerkColumn as PerkColumnModel } from '@/models/deduped-weapon'
import PerkCell from './PerkCell.vue'

const props = defineProps<{
  column: PerkColumnModel
}>()

const ownedCount = computed(() => {
  return props.column.availablePerks.filter(perk => perk.isOwned).length
})
</script>
