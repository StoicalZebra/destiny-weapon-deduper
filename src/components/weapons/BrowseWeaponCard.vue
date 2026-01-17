<template>
  <RouterLink
    :to="`/browse/${weapon.hash}`"
    class="block rounded-xl border border-border bg-surface-elevated p-4 transition hover:border-accent-primary"
  >
    <div class="flex items-start gap-3">
      <WeaponIcon
        :icon="weapon.displayProperties.icon"
        :watermark="weaponWatermark"
        :alt="weapon.displayProperties.name"
        size="md"
      />
      <div class="min-w-0 flex-1">
        <h3 class="text-lg font-semibold truncate">{{ weapon.displayProperties.name }}</h3>
        <p v-if="seasonName" class="text-xs text-text-subtle">{{ seasonName }}</p>
        <div class="flex items-center gap-2 mt-1">
          <span
            class="text-xs px-1.5 py-0.5 rounded"
            :class="tierClass"
          >
            {{ tierLabel }}
          </span>
          <span class="text-xs text-text-subtle">{{ weapon.itemTypeDisplayName }}</span>
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

const props = defineProps<{
  weapon: DestinyInventoryItemDefinition
}>()

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

const tierLabel = computed(() => {
  const tierType = props.weapon.inventory?.tierType
  if (tierType === 6) return 'Exotic'
  if (tierType === 5) return 'Legendary'
  return 'Unknown'
})

const tierClass = computed(() => {
  const tierType = props.weapon.inventory?.tierType
  if (tierType === 6) return 'bg-yellow-500/20 text-yellow-400'
  if (tierType === 5) return 'bg-purple-500/20 text-purple-400'
  return 'bg-gray-500/20 text-gray-400'
})
</script>
