<template>
  <RouterLink
    :to="`/weapons/${weapon.weaponHash}`"
    class="block rounded-xl border border-gray-700 bg-gray-800 p-4 transition hover:border-blue-500"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-start gap-3 min-w-0">
        <WeaponIcon
          :icon="weapon.weaponIcon"
          :watermark="weapon.iconWatermark"
          :alt="weapon.weaponName"
          size="md"
        />
        <div class="min-w-0">
          <h3 class="text-lg font-semibold truncate">{{ weapon.weaponName }}</h3>
          <p class="text-xs text-gray-500">{{ tierLabel }}</p>
        </div>
      </div>
      <div class="text-right flex-shrink-0">
        <p class="text-lg font-semibold text-blue-300">{{ weapon.instances.length }}</p>
        <p class="text-[10px] text-gray-500 uppercase">{{ weapon.instances.length === 1 ? 'Copy' : 'Copies' }}</p>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { DedupedWeapon } from '@/models/deduped-weapon'
import WeaponIcon from '@/components/common/WeaponIcon.vue'

const props = defineProps<{
  weapon: DedupedWeapon
}>()

const tierLabel = computed(() => {
  const { minGearTier, maxGearTier, instances } = props.weapon

  // No tier data available (null, undefined, or not a valid number)
  if (minGearTier == null || maxGearTier == null) {
    return 'No Tier'
  }

  // Single instance or all same tier
  if (instances.length === 1 || minGearTier === maxGearTier) {
    return `Tier ${maxGearTier}`
  }

  // Range of tiers
  return `Tiers ${minGearTier}-${maxGearTier}`
})
</script>
