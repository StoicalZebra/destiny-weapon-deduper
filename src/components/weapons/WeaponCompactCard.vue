<template>
  <RouterLink
    :to="`/weapons/${weapon.weaponHash}`"
    class="block rounded-xl border border-border bg-surface-elevated p-4 transition hover:border-accent-primary"
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
          <p v-if="weapon.seasonName" class="text-xs text-text-subtle">{{ weapon.seasonName }}</p>
          <p class="text-xs text-text-subtle">{{ tierLabel }}</p>
        </div>
      </div>
      <div class="text-right flex-shrink-0">
        <p class="text-lg font-semibold text-accent-primary">{{ weapon.instances.length }}</p>
        <p class="text-xs text-text-subtle uppercase">{{ weapon.instances.length === 1 ? 'Copy' : 'Copies' }}</p>
        <!-- Single variant: simple hash display -->
        <p v-if="weapon.variantHashes.length === 1" class="text-xs text-text-subtle">
          Hash ...{{ formatHashSuffix(weapon.variantHashes[0].hash) }}
        </p>
        <!-- Multiple variants: show labels for each -->
        <div v-else class="text-xs space-y-0.5 mt-1">
          <div
            v-for="variant in weapon.variantHashes"
            :key="variant.hash"
            class="flex items-center gap-1 justify-end"
          >
            <span v-if="variant.isHolofoil" class="text-purple-400">Holofoil</span>
            <span v-else class="text-text-subtle">Normal</span>
            <span class="text-text-subtle font-mono">...{{ formatHashSuffix(variant.hash) }}</span>
          </div>
        </div>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { DedupedWeapon } from '@/models/deduped-weapon'
import WeaponIcon from '@/components/common/WeaponIcon.vue'
import { formatHashSuffix } from '@/utils/formatting'

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
