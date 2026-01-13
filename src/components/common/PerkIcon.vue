<template>
  <div
    class="relative group inline-block"
    :title="tooltip"
  >
    <!-- Perk icon with ring indicator -->
    <div
      class="rounded-full overflow-hidden"
      :class="[sizeClasses, ringClasses]"
    >
      <img
        v-if="iconUrl"
        :src="iconUrl"
        class="w-full h-full object-cover"
        :alt="name"
      />
      <div v-else class="w-full h-full bg-gray-700 flex items-center justify-center">
        <span class="text-gray-500" :class="placeholderTextClass">?</span>
      </div>
    </div>

    <!-- Optional badge slot (for wishlist indicators, etc.) -->
    <slot name="badge"></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { manifestService } from '@/services/manifest-service'

const props = withDefaults(defineProps<{
  /** Perk hash to look up from manifest */
  perkHash: number
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Ring color variant */
  variant?: 'default' | 'highlighted' | 'wishlist' | 'owned' | 'none'
  /** Override tooltip (otherwise uses perk name + description) */
  customTooltip?: string
}>(), {
  size: 'md',
  variant: 'default'
})

// Get perk definition from manifest
const perkDef = computed(() => manifestService.getInventoryItem(props.perkHash))

const name = computed(() => perkDef.value?.displayProperties?.name || 'Unknown')
const description = computed(() => perkDef.value?.displayProperties?.description || '')
const iconPath = computed(() => perkDef.value?.displayProperties?.icon || null)

const iconUrl = computed(() =>
  iconPath.value ? `https://www.bungie.net${iconPath.value}` : null
)

const tooltip = computed(() => {
  if (props.customTooltip) return props.customTooltip
  return description.value ? `${name.value}\n${description.value}` : name.value
})

// Size classes - increased minimums for better visibility
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-6 h-6'   // 24px (was 20px)
    case 'lg': return 'w-10 h-10' // 40px (was 32px)
    default: return 'w-8 h-8'    // 32px (was 24px)
  }
})

const placeholderTextClass = computed(() => {
  // Use text-xs (12px) as minimum for all sizes
  return 'text-xs'
})

// Ring classes based on variant
const ringClasses = computed(() => {
  switch (props.variant) {
    case 'highlighted':
      return 'ring-2 ring-orange-400 ring-offset-1 ring-offset-gray-900'
    case 'wishlist':
      return 'ring-1 ring-yellow-500/70 ring-offset-1 ring-offset-gray-900'
    case 'owned':
      return 'ring-1 ring-white/80 ring-offset-1 ring-offset-gray-900'
    case 'none':
      return ''
    default:
      return 'ring-1 ring-gray-600 ring-offset-1 ring-offset-gray-900'
  }
})

// Expose computed values for parent components that need them
defineExpose({
  name,
  description,
  iconUrl
})
</script>
