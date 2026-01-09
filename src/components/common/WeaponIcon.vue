<template>
  <div class="relative inline-block" :style="containerStyle">
    <!-- Base weapon icon -->
    <img
      v-if="icon"
      :src="`https://www.bungie.net${icon}`"
      :alt="alt"
      class="rounded"
      :class="sizeClass"
    />
    <div v-else class="bg-gray-700 rounded" :class="sizeClass"></div>

    <!-- Season/version watermark overlay -->
    <img
      v-if="watermark"
      :src="`https://www.bungie.net${watermark}`"
      alt=""
      class="absolute inset-0 rounded pointer-events-none"
      :class="sizeClass"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  icon?: string
  watermark?: string
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>(), {
  icon: '',
  watermark: '',
  alt: 'Weapon icon',
  size: 'md'
})

const sizeClass = computed(() => {
  const sizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  }
  return sizes[props.size]
})

const containerStyle = computed(() => {
  const sizes = {
    xs: { width: '1.5rem', height: '1.5rem' },
    sm: { width: '2rem', height: '2rem' },
    md: { width: '3rem', height: '3rem' },
    lg: { width: '4rem', height: '4rem' },
    xl: { width: '5rem', height: '5rem' }
  }
  return sizes[props.size]
})
</script>
