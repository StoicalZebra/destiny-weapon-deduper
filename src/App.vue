<template>
  <!-- Manifest Loading Screen -->
  <div v-if="manifestStore.loading && !manifestStore.isInitialized" class="min-h-screen flex items-center justify-center bg-gray-900">
    <div class="text-center max-w-md mx-auto px-4">
      <LoadingSpinner />
      <h2 class="text-2xl font-bold mt-6 mb-2">Loading Destiny 2 Database</h2>
      <p class="text-gray-400 mb-4">
        {{ manifestStore.currentTable || 'Initializing...' }}
      </p>
      <div class="w-full bg-gray-700 rounded-full h-2 mb-2">
        <div
          class="bg-blue-500 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${manifestStore.progressPercentage}%` }"
        ></div>
      </div>
      <p class="text-sm text-gray-500">
        {{ Math.round(manifestStore.progressPercentage) }}%
      </p>
      <p class="text-xs text-gray-600 mt-4">
        This only happens once. The database will be cached locally.
      </p>
    </div>
  </div>

  <!-- Manifest Error Screen -->
  <div v-else-if="manifestStore.error" class="min-h-screen flex items-center justify-center bg-gray-900">
    <div class="text-center max-w-md mx-auto px-4">
      <div class="text-red-400 text-5xl mb-4">⚠️</div>
      <h2 class="text-2xl font-bold mb-2">Failed to Load Database</h2>
      <p class="text-gray-400 mb-6">{{ manifestStore.error }}</p>
      <button
        @click="retryManifest"
        class="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
      >
        Retry
      </button>
    </div>
  </div>

  <!-- Main App -->
  <div v-else class="min-h-screen flex flex-col">
    <AppHeader />
    <main class="flex-1 container mx-auto px-4 py-8">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useManifestStore } from './stores/manifest'
import AppHeader from './components/layout/AppHeader.vue'
import AppFooter from './components/layout/AppFooter.vue'
import LoadingSpinner from './components/common/LoadingSpinner.vue'

const manifestStore = useManifestStore()

onMounted(async () => {
  // Initialize manifest on app load
  await manifestStore.initialize()
})

const retryManifest = async () => {
  await manifestStore.initialize()
}
</script>
