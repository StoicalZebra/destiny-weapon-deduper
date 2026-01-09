<template>
  <header class="bg-gray-800 border-b border-gray-700">
    <div class="container mx-auto px-4 py-4 flex items-center justify-between">
      <RouterLink to="/" class="flex items-center gap-3 text-2xl font-bold text-white hover:text-gray-300 transition">
        <img src="/images/icon.webp" alt="D3 Icon" class="w-8 h-8 rounded" />
        Destiny DeDuper (D3)
      </RouterLink>

      <nav class="flex items-center gap-6">
        <RouterLink
          to="/about"
          class="text-gray-300 hover:text-white transition"
        >
          About
        </RouterLink>

        <RouterLink
          v-if="authStore.isAuthenticated"
          to="/godrolls"
          class="text-gray-300 hover:text-white transition"
        >
          God Roll Manager
        </RouterLink>

        <RouterLink
          to="/settings"
          class="text-gray-300 hover:text-white transition"
        >
          Settings
        </RouterLink>

        <div v-if="authStore.isAuthenticated" class="flex items-center gap-4">
          <span class="text-sm text-gray-400">
            {{ authStore.user?.displayName || 'Guardian' }}
          </span>
          <button
            @click="logout"
            class="text-sm text-red-400 hover:text-red-300 transition"
          >
            Logout
          </button>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const logout = () => {
  authStore.clearAuth()
  router.push('/about')
}
</script>
