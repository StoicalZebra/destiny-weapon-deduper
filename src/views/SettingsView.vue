<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-8">Settings</h1>

    <!-- God Roll Data Section -->
    <div class="rounded-xl border border-gray-700 bg-gray-800 p-6 mb-6">
      <h2 class="text-xl font-semibold mb-2">God Roll Data</h2>
      <p class="text-sm text-gray-400 mb-6">
        You have <span class="text-white font-medium">{{ stats.rollCount }}</span> god rolls
        across <span class="text-white font-medium">{{ stats.weaponCount }}</span> weapons
      </p>

      <!-- Export Button -->
      <button
        @click="handleExport"
        :disabled="stats.rollCount === 0"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors mb-6"
      >
        Export God Rolls
      </button>

      <!-- Import Drop Zone -->
      <div
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
        :class="isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'"
      >
        <p class="text-gray-400 mb-3">Drop JSON file here to import</p>
        <label class="cursor-pointer">
          <span class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors inline-block">
            Browse...
          </span>
          <input
            type="file"
            accept=".json,application/json"
            @change="handleFileSelect"
            class="hidden"
          />
        </label>
      </div>

      <p class="mt-3 text-sm text-gray-500">
        Want to create one from scratch?
        <a
          href="https://github.com/StoicalZebra/destiny-weapon-deduper/blob/main/data/godroll-export-template.json"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-400 hover:text-blue-300 underline"
        >View the JSON template</a>
      </p>

      <!-- Import Result Message -->
      <div v-if="importMessage" class="mt-4 p-3 rounded-lg" :class="importSuccess ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'">
        {{ importMessage }}
      </div>
    </div>

    <!-- Import Mode Dialog -->
    <div v-if="showImportDialog" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
        <h3 class="text-lg font-semibold mb-2">Import God Rolls</h3>
        <p class="text-sm text-gray-400 mb-4">
          Found {{ pendingImport?.godRolls.length }} weapons with god rolls.
          How would you like to import?
        </p>

        <div class="space-y-3 mb-6">
          <button
            @click="confirmImport('merge')"
            class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors text-left"
          >
            <span class="block font-semibold">Merge</span>
            <span class="text-sm text-blue-200">Keep existing rolls, add new ones (skip duplicates)</span>
          </button>
          <button
            @click="confirmImport('replace')"
            class="w-full px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors text-left"
          >
            <span class="block font-semibold">Replace All</span>
            <span class="text-sm text-orange-200">Delete all existing rolls and import fresh</span>
          </button>
        </div>

        <button
          @click="cancelImport"
          class="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="rounded-xl border border-red-900/50 bg-red-950/20 p-6 mb-6">
      <h2 class="text-xl font-semibold text-red-400 mb-2">Danger Zone</h2>
      <p class="text-sm text-gray-400 mb-4">
        This action cannot be undone. Consider exporting your god rolls first.
      </p>

      <button
        v-if="!showClearConfirm"
        @click="showClearConfirm = true"
        :disabled="stats.rollCount === 0"
        class="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        Clear All God Rolls
      </button>

      <div v-else class="flex items-center gap-3">
        <span class="text-sm text-gray-300">Are you sure?</span>
        <button
          @click="handleClearAll"
          class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors"
        >
          Yes, Delete All
        </button>
        <button
          @click="showClearConfirm = false"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Storage Info -->
    <div class="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
      <h2 class="text-xl font-semibold mb-2">About Storage</h2>
      <p class="text-sm text-gray-400 mb-4">
        Your god rolls are stored locally in your browser using localStorage. They persist across sessions and survive normal cache clearing.
      </p>
      <div class="text-sm text-gray-400 space-y-2">
        <p class="font-medium text-gray-300">Your data will be lost if you:</p>
        <ul class="list-disc list-inside space-y-1 ml-2">
          <li>Clear "Site data" or "Cookies and other site data" in browser settings</li>
          <li>Use a different browser or device</li>
          <li>Use private/incognito mode</li>
        </ul>
        <p class="mt-4 text-gray-500">
          Use the Export feature above to back up your god rolls and transfer them between devices.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { godRollStorageService, type GodRollExport } from '@/services/godroll-storage-service'

const stats = ref({ rollCount: 0, weaponCount: 0 })
const isDragging = ref(false)
const showClearConfirm = ref(false)
const showImportDialog = ref(false)
const pendingImport = ref<GodRollExport | null>(null)
const importMessage = ref('')
const importSuccess = ref(false)

onMounted(() => {
  refreshStats()
})

function refreshStats() {
  stats.value = godRollStorageService.getStats()
}

function handleExport() {
  godRollStorageService.downloadExport()
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file) {
    await processFile(file)
  }
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    await processFile(file)
  }
  // Reset input so same file can be selected again
  input.value = ''
}

async function processFile(file: File) {
  importMessage.value = ''

  if (!file.name.endsWith('.json')) {
    importMessage.value = 'Please select a JSON file'
    importSuccess.value = false
    return
  }

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!godRollStorageService.validateImport(data)) {
      importMessage.value = 'Invalid file format. Please use a file exported from this app.'
      importSuccess.value = false
      return
    }

    pendingImport.value = data
    showImportDialog.value = true
  } catch (e) {
    importMessage.value = 'Failed to parse file. Please check the file format.'
    importSuccess.value = false
  }
}

function confirmImport(mode: 'merge' | 'replace') {
  if (!pendingImport.value) return

  const result = godRollStorageService.importAll(pendingImport.value, mode)

  if (mode === 'merge') {
    importMessage.value = `Imported ${result.imported} god rolls. ${result.skipped > 0 ? `Skipped ${result.skipped} duplicates.` : ''}`
  } else {
    importMessage.value = `Replaced all god rolls. Imported ${result.imported} rolls across ${result.weaponsAffected} weapons.`
  }

  importSuccess.value = true
  showImportDialog.value = false
  pendingImport.value = null
  refreshStats()
}

function cancelImport() {
  showImportDialog.value = false
  pendingImport.value = null
}

function handleClearAll() {
  const count = godRollStorageService.clearAll()
  importMessage.value = `Cleared ${count} weapons worth of god rolls.`
  importSuccess.value = true
  showClearConfirm.value = false
  refreshStats()
}
</script>
