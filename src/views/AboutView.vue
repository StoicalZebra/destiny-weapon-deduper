<template>
  <div class="text-center max-w-4xl mx-auto">
    <div class="p-8 bg-surface-elevated border border-border rounded-lg flex gap-8 items-center">
      <div class="flex-1">
        <h2 class="text-2xl font-semibold mb-4 text-left text-text">What is Destiny Weapon Deduper?</h2>
        <ul class="text-left space-y-3 text-text-muted">
          <li class="flex items-start">
            <span class="text-green-500 dark:text-green-400 mr-2">✓</span>
            <span>Consolidate duplicate weapons into a single "punch-card" matrix view</span>
          </li>
          <li class="flex items-start">
            <span class="text-green-500 dark:text-green-400 mr-2">✓</span>
            <span>Track your wishlist progress for each weapon</span>
          </li>
          <li class="flex items-start">
            <span class="text-green-500 dark:text-green-400 mr-2">✓</span>
            <span>Know exactly which duplicate weapons you can safely dismantle</span>
          </li>
          <li class="flex items-start">
            <span class="text-green-500 dark:text-green-400 mr-2">✓</span>
            <span>See all perk combinations you've earned across all instances</span>
          </li>
        </ul>
      </div>
      <div class="flex-1">
        <img src="/images/icon.webp" alt="Destiny Weapon Deduper" class="max-w-full rounded-lg" />
      </div>
    </div>

    <div class="mt-12">
      <img src="/images/graphic.webp" alt="Destiny Weapon Deduper" class="max-w-full mx-auto rounded-lg" />
    </div>

    <!-- Developer Tools - only visible when authenticated -->
    <section v-if="authStore.isAuthenticated" class="mt-16 pt-8 border-t border-border/30 text-left">
      <details class="text-sm text-text-muted">
        <summary class="cursor-pointer hover:text-text">Developer Tools</summary>
        <div class="mt-4 space-y-6">
          <!-- Workflow Summary -->
          <div class="p-4 bg-surface rounded-lg border border-border/50">
            <h4 class="font-medium text-text mb-3">Updating Canonical Wishlist</h4>
            <ol class="space-y-2 text-xs">
              <li><span class="text-text-subtle">1.</span> Run <code class="px-1 py-0.5 bg-surface-overlay rounded">npm run dev</code> locally</li>
              <li><span class="text-text-subtle">2.</span> Navigate to Wishlists &rarr; StoicalZebra</li>
              <li><span class="text-text-subtle">3.</span> Edit rolls, add notes, update tags</li>
              <li><span class="text-text-subtle">4.</span> Click <span class="text-amber-500 font-medium">Save as Canonical</span> button</li>
              <li><span class="text-text-subtle">5.</span> Commit and push to GitHub</li>
            </ol>
            <p class="mt-3 text-xs text-text-subtle">Previous versions auto-archived to <code class="px-1 py-0.5 bg-surface-overlay rounded">data/wishlists/archive/</code></p>
          </div>

          <!-- Export Button -->
          <div>
            <p class="mb-2">Export inventory for local development (mock mode):</p>
            <button
              @click="exportInventory"
              :disabled="exporting"
              class="px-3 py-1.5 bg-surface-elevated hover:bg-surface-overlay border border-border rounded text-sm disabled:opacity-50"
            >
              {{ exporting ? 'Exporting...' : 'Export Inventory JSON' }}
            </button>
            <p v-if="exportStatus" class="mt-2 text-xs" :class="exportStatus.success ? 'text-green-500' : 'text-red-500'">
              {{ exportStatus.message }}
            </p>
          </div>
        </div>
      </details>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useWeaponsStore } from '@/stores/weapons'

const authStore = useAuthStore()
const weaponsStore = useWeaponsStore()

const exporting = ref(false)
const exportStatus = ref<{ success: boolean; message: string } | null>(null)

const exportInventory = async () => {
  exporting.value = true
  exportStatus.value = null

  try {
    // Load weapons if not already loaded (to get raw response)
    if (!weaponsStore.rawProfileResponse) {
      await weaponsStore.loadWeapons()
    }

    const content = weaponsStore.exportRawInventory()
    if (!content) {
      exportStatus.value = { success: false, message: 'No inventory data to export' }
      return
    }

    // Download the file
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mock-inventory.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    exportStatus.value = { success: true, message: 'Downloaded! Copy to data/mock-inventory.json' }
  } catch (err) {
    exportStatus.value = {
      success: false,
      message: err instanceof Error ? err.message : 'Export failed'
    }
  } finally {
    exporting.value = false
  }
}
</script>
