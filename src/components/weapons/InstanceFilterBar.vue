<template>
  <div class="flex items-center justify-between flex-wrap gap-2">
    <h4 class="font-bold text-lg">In Your Inventory ({{ instanceCount }})</h4>
    <div class="flex items-center gap-2">
      <!-- Sort toggle -->
      <button
        @click="$emit('cycleSortOrder')"
        class="px-2 py-1 text-xs font-medium rounded transition-colors"
        :class="sortOrder !== 'none' ? 'bg-surface-overlay text-text' : 'bg-surface-elevated text-text-muted hover:bg-surface-overlay'"
        title="Sort by tier"
      >
        {{ sortOrder === 'desc' ? '↓' : sortOrder === 'asc' ? '↑' : '−' }} Tier
      </button>
      <!-- Tier filter buttons -->
      <div class="flex gap-0.5 bg-surface-elevated rounded p-0.5">
        <button
          v-for="tier in [5, 4, 3, 2, 1]"
          :key="tier"
          @click="$emit('toggleTier', tier)"
          class="w-6 h-6 text-xs font-medium rounded transition-colors"
          :class="enabledTiers.has(tier) ? 'bg-surface-overlay text-text' : 'bg-surface-elevated text-text-subtle hover:text-text-muted'"
          :title="`Toggle Tier ${tier}`"
        >
          {{ tier }}
        </button>
        <button
          @click="$emit('toggleTier', null)"
          class="w-6 h-6 text-xs font-medium rounded transition-colors"
          :class="enabledTiers.has(null) ? 'bg-surface-overlay text-text' : 'bg-surface-elevated text-text-subtle hover:text-text-muted'"
          title="Toggle No Tier"
        >
          0
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  instanceCount: number
  sortOrder: 'desc' | 'asc' | 'none'
  enabledTiers: Set<number | null>
}>()

defineEmits<{
  (e: 'cycleSortOrder'): void
  (e: 'toggleTier', tier: number | null): void
}>()
</script>
