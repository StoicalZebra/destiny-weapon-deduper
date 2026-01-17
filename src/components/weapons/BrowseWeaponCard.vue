<template>
  <RouterLink
    :to="`/browse/${weapon.hash}`"
    class="block rounded-xl border border-border bg-surface-elevated p-4 transition hover:border-accent-primary"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-start gap-3 min-w-0">
        <WeaponIcon
          :icon="weapon.displayProperties.icon"
          :watermark="weaponWatermark"
          :alt="weapon.displayProperties.name"
          size="md"
        />
        <div class="min-w-0">
          <h3 class="text-lg font-semibold truncate">{{ weapon.displayProperties.name }}</h3>
          <p class="text-sm text-text-muted">{{ weapon.itemTypeDisplayName }}</p>
          <p v-if="seasonName" class="text-xs text-text-subtle">{{ seasonName }}</p>
        </div>
      </div>
      <div class="text-right flex-shrink-0 self-end">
        <!-- Single hash: simple display -->
        <p v-if="variantHashes.length === 1" class="text-xs text-text-subtle">
          Hash ...{{ formatHashSuffix(variantHashes[0]) }}
        </p>
        <!-- Multiple variants: show labels for each -->
        <div v-else class="text-xs space-y-0.5 mt-1">
          <div
            v-for="hash in variantHashes"
            :key="hash"
            class="flex items-center gap-1 justify-end"
          >
            <span v-if="isHolofoil(hash)" class="text-purple-400">Holofoil</span>
            <span v-else class="text-text-subtle">Normal</span>
            <span class="text-text-subtle font-mono">...{{ formatHashSuffix(hash) }}</span>
          </div>
        </div>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { DestinyInventoryItemDefinition } from '@/services/manifest-service'
import { manifestService } from '@/services/manifest-service'
import WeaponIcon from '@/components/common/WeaponIcon.vue'
import { formatHashSuffix } from '@/utils/formatting'

const props = defineProps<{
  weapon: DestinyInventoryItemDefinition
}>()

// Get all variant hashes for this weapon (normal + holofoil)
const variantHashes = computed(() => {
  return manifestService.getWeaponVariantHashes(props.weapon.hash)
})

// Check if a specific hash is a holofoil variant
const isHolofoil = (hash: number): boolean => {
  return manifestService.isHolofoilWeapon(hash)
}

const weaponWatermark = computed(() => {
  return props.weapon.iconWatermark || props.weapon.quality?.displayVersionWatermarkIcons?.[0]
})

const seasonName = computed(() => {
  // Try to get season from hash
  if (props.weapon.seasonHash) {
    const season = manifestService.getSeason(props.weapon.seasonHash)
    if (season?.displayProperties?.name) {
      return season.displayProperties.name
    }
  }

  // Fall back to watermark-based season number
  const seasonNum = manifestService.getSeasonFromWatermark(weaponWatermark.value)
  if (seasonNum) {
    return `Season ${seasonNum}`
  }

  return null
})

</script>
