<template>
  <header class="bg-gray-800 border-b border-gray-700">
    <div class="container mx-auto px-4 py-4 flex items-center justify-between">
      <RouterLink to="/" class="flex items-center gap-3 text-2xl font-bold text-white hover:text-gray-300 transition">
        <img src="/images/icon.webp" alt="D3 Icon" class="w-8 h-8 rounded" />
        Destiny Weapon Deduper
      </RouterLink>

      <nav class="flex items-center gap-6">
        <RouterLink
          to="/"
          class="text-gray-300 hover:text-white transition"
        >
          Weapons
        </RouterLink>

        <RouterLink
          to="/wishlists"
          class="text-gray-300 hover:text-white transition"
        >
          Wishlists
        </RouterLink>

        <RouterLink
          to="/about"
          class="text-gray-300 hover:text-white transition"
        >
          About
        </RouterLink>

        <!-- Logged in: Platform icon + Logout -->
        <div v-if="authStore.isAuthenticated" class="flex items-center gap-3">
          <!-- Platform icon with tooltip -->
          <div class="relative group">
            <div
              class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center cursor-default hover:bg-gray-600 transition-colors"
              :title="displayName"
            >
              <!-- Xbox -->
              <svg v-if="platformType === 1" class="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.102 21.033C6.211 22.881 8.977 24 12 24c3.026 0 5.789-1.119 7.902-2.967 1.877-1.912-4.316-8.709-7.902-11.417-3.582 2.708-9.779 9.505-7.898 11.417zm11.16-14.406c2.5 2.961 7.484 10.313 6.076 12.912C23.056 17.36 24 14.796 24 12c0-4.124-2.093-7.762-5.27-9.904-1.522-.869-4.548 1.71-3.468 4.531zM12 2.695c.006-.327.078-2.695 2.957-2.695.349.009.691.065 1.016.169-2.002 1.549-4.005 3.665-5.973 6.114-1.966-2.449-3.969-4.565-5.972-6.114.325-.103.666-.159 1.015-.168 2.879 0 2.951 2.368 2.957 2.694V2.695zm-8.738 6.44c-1.18-2.821-4.207-5.399-5.729-4.53C-5.643 6.571.064 11.075 2.5 14.036c1.08-2.821-1.946-4.37 .762-4.901z"/>
              </svg>
              <!-- PlayStation -->
              <svg v-else-if="platformType === 2" class="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.985 2.596v17.548l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.181.76.814.76 1.505v5.875c2.441 1.193 4.362-.002 4.362-3.153 0-3.237-1.126-4.675-4.438-5.827-1.307-.448-3.728-1.186-5.393-1.501zm4.668 17.298-4.097-1.473c-.455-.174-.996-.024-1.207.339-.209.362.009.797.499.954l4.118 1.36-.313 1.126-4.796-1.644c-.495-.187-1.106-.019-1.345.356-.225.355.014.843.524 1.027l5.032 1.731-.415 1.257-5.633-1.899c-.47-.182-1.051-.023-1.262.351-.198.342.023.791.502.957l6.385 2.148-.299 1.076-7.169-2.375c-.479-.191-1.062-.027-1.281.342-.211.363.007.818.513 1.018l7.923 2.643-.015 1.134-8.709-2.94a.954.954 0 0 0-.634 1.761l8.682 2.886.661 3.207h3.012v-6.504l-.306.106a.63.63 0 0 1-.808-.371.632.632 0 0 1 .352-.806l.762-.272V19.07l-3.115 1.057c-.538.182-1.168.035-1.415-.329-.24-.351-.008-.81.545-1.015l3.985-1.351v-1.542z"/>
              </svg>
              <!-- Steam (default for 3+) -->
              <svg v-else class="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
              </svg>
            </div>
            <!-- Tooltip with username -->
            <div class="absolute right-0 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              {{ displayName }}
            </div>
          </div>
          <button
            @click="logout"
            class="text-sm text-red-400 hover:text-red-300 transition"
          >
            Logout
          </button>
        </div>

        <!-- Logged out: Login button -->
        <button
          v-else
          @click="login"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
        >
          Login
        </button>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

// Platform type from selected membership (1=Xbox, 2=PlayStation, 3=Steam, etc.)
const platformType = computed(() => authStore.selectedMembership?.membershipType ?? 3)

// Display name with Bungie global name format
const displayName = computed(() => {
  const membership = authStore.selectedMembership
  if (!membership) return authStore.user?.displayName || 'Guardian'

  // Use Bungie global display name with code if available
  if (membership.bungieGlobalDisplayName && membership.bungieGlobalDisplayNameCode) {
    return `${membership.bungieGlobalDisplayName}#${membership.bungieGlobalDisplayNameCode}`
  }
  return membership.displayName || authStore.user?.displayName || 'Guardian'
})

const login = () => {
  authStore.initiateLogin()
}

const logout = () => {
  authStore.clearAuth()
  router.push('/about')
}
</script>
