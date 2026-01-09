<template>
  <div class="rounded-lg border border-gray-700 bg-gray-900/40 p-3">
    <div class="flex items-center justify-between">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-400">Instances</h4>
      <span class="text-xs text-gray-500">{{ instances.length }}</span>
    </div>
    <div class="mt-2 space-y-1 text-xs text-gray-500">
      <div
        v-for="(instance, idx) in instances"
        :key="instance.itemInstanceId"
        class="flex items-center justify-between"
      >
        <span>Copy {{ idx + 1 }}</span>
        <span :class="getTierClass(instance.gearTier)">{{ formatTier(instance.gearTier) }}</span>
        <span class="font-mono text-gray-600">{{ instance.itemInstanceId.slice(0, 12) }}...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WeaponInstance } from '@/models/weapon-instance'

defineProps<{
  instances: WeaponInstance[]
}>()

function formatTier(tier: number | null | undefined): string {
  if (tier == null) {
    return 'No Tier'
  }
  const stars = '★'.repeat(tier)
  return `Tier ${tier} ${stars}`
}

function getTierClass(tier: number | null | undefined): string {
  if (tier == null) {
    return 'text-gray-600'
  }
  return 'text-gray-400'
}
</script>
