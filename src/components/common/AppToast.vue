<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="visible"
      :class="[
        'flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg',
        positionClasses,
        typeClasses
      ]"
    >
      <!-- Icon -->
      <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          v-if="type === 'success'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 13l4 4L19 7"
        />
        <path
          v-else-if="type === 'error'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
        <path
          v-else
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <!-- Message -->
      <span class="text-sm">{{ message }}</span>

      <!-- Close button (optional) -->
      <button
        v-if="dismissible"
        @click="$emit('dismiss')"
        class="ml-auto p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type ToastType = 'success' | 'info' | 'warning' | 'error'
export type ToastPosition = 'fixed' | 'inline'

const props = withDefaults(
  defineProps<{
    visible: boolean
    message: string
    type?: ToastType
    position?: ToastPosition
    dismissible?: boolean
  }>(),
  {
    type: 'success',
    position: 'fixed',
    dismissible: false
  }
)

defineEmits<{
  dismiss: []
}>()

const positionClasses = computed(() => {
  if (props.position === 'fixed') {
    return 'fixed bottom-4 right-4 z-50'
  }
  return 'mb-4'
})

const typeClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-green-600 text-white'
    case 'info':
      return 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700/50 text-blue-800 dark:text-blue-200'
    case 'warning':
      return 'bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50 text-amber-800 dark:text-amber-200'
    case 'error':
      return 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700/50 text-red-800 dark:text-red-200'
    default:
      return 'bg-green-600 text-white'
  }
})
</script>
