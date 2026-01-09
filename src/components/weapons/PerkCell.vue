<template>
  <div>
    <div
      ref="triggerRef"
      class="flex items-center gap-2 rounded border px-2 py-1 text-xs"
      :class="perk.isOwned ? 'border-green-500/70 bg-green-900/40 text-green-100' : 'border-gray-700 bg-gray-900/40 text-gray-400'"
      tabindex="0"
      role="button"
      :aria-label="perkTooltip"
      @mouseenter="showTooltip"
      @mouseleave="hideTooltip"
      @focus="showTooltip"
      @blur="hideTooltip"
    >
      <img
        v-if="perk.icon"
        :src="`https://www.bungie.net${perk.icon}`"
        :alt="perk.name"
        class="h-5 w-5 rounded"
      />
      <div v-else class="h-5 w-5 rounded bg-gray-700"></div>
      <span class="truncate">{{ perk.name || 'Unknown Perk' }}</span>
    </div>

    <Teleport to="body">
      <div
        v-if="tooltipVisible"
        class="pointer-events-none fixed z-[9999] w-56 rounded border border-gray-700 bg-gray-900 p-2 text-xs text-gray-200 shadow-lg"
        :style="tooltipStyle"
      >
        <p class="font-semibold text-gray-100">{{ perk.name || 'Unknown Perk' }}</p>
        <p class="mt-1 text-gray-400">{{ perk.description || 'No description available.' }}</p>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Perk } from '@/models/perk'

const props = defineProps<{
  perk: Perk
}>()

const perkTooltip = `${props.perk.name}: ${props.perk.description || 'No description available.'}`
const triggerRef = ref<HTMLElement | null>(null)
const tooltipVisible = ref(false)
const tooltipStyle = ref<Record<string, string>>({})

const TOOLTIP_WIDTH = 224
const TOOLTIP_MARGIN = 8

const showTooltip = () => {
  const rect = triggerRef.value?.getBoundingClientRect()
  if (!rect) return

  const left = Math.min(
    Math.max(TOOLTIP_MARGIN, rect.left),
    window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN
  )

  tooltipStyle.value = {
    left: `${left}px`,
    top: `${rect.top - TOOLTIP_MARGIN}px`,
    transform: 'translateY(-100%)'
  }

  tooltipVisible.value = true
}

const hideTooltip = () => {
  tooltipVisible.value = false
}
</script>
