<template>
  <button
    v-if="!authStore.isAuthenticated"
    @click="login"
    class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
  >
    Login with Bungie
  </button>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const login = () => {
  authStore.initiateLogin()
}
</script>
