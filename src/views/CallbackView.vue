<template>
  <div class="text-center py-12">
    <LoadingSpinner />
    <p class="mt-4 text-gray-400">{{ status }}</p>
    <p v-if="error" class="mt-4 text-red-400">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const router = useRouter()
const authStore = useAuthStore()
const status = ref('Completing authentication...')
const error = ref('')

onMounted(async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')

    if (!code || !state) {
      throw new Error('Missing authorization code or state parameter')
    }

    await authStore.handleCallback(code, state)

    status.value = 'Authentication successful! Redirecting...'

    setTimeout(() => {
      router.push('/')
    }, 1000)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Authentication failed'
    status.value = 'Authentication failed'

    setTimeout(() => {
      router.push('/')
    }, 3000)
  }
})
</script>
