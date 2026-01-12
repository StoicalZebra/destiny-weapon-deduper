<template>
  <div class="rounded-xl border border-gray-700 bg-gray-800 p-5">
    <h3 class="text-lg font-semibold">Import Wishlist</h3>
    <p class="mt-1 text-sm text-gray-400">
      Import a DIM-compatible wishlist (.txt format)
    </p>

    <!-- Drop zone -->
    <div
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="handleDrop"
      :class="[
        'mt-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
        isDragging
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-600 hover:border-gray-500'
      ]"
    >
      <div v-if="!importing">
        <svg class="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="mt-2 text-sm text-gray-400">
          Drag & drop a .txt file here, or
          <label class="cursor-pointer text-blue-400 hover:text-blue-300">
            browse
            <input
              type="file"
              accept=".txt"
              class="sr-only"
              @change="handleFileSelect"
            />
          </label>
        </p>
      </div>

      <div v-else class="flex items-center justify-center gap-2">
        <svg class="h-5 w-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-sm text-gray-400">Importing...</span>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="mt-4 rounded-lg bg-red-900/30 border border-red-700/50 p-3 text-sm text-red-300">
      {{ error }}
    </div>

    <!-- Success message -->
    <div v-if="successMessage" class="mt-4 rounded-lg bg-green-900/30 border border-green-700/50 p-3 text-sm text-green-300">
      {{ successMessage }}
    </div>

    <!-- Import name input (shown after file is selected) -->
    <div v-if="pendingContent && !importing" class="mt-4 space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-300">Wishlist Name</label>
        <input
          v-model="importName"
          type="text"
          placeholder="My Imported Wishlist"
          class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div class="flex gap-2">
        <button
          @click="confirmImport"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          Import
        </button>
        <button
          @click="cancelImport"
          class="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWishlistsStore } from '@/stores/wishlists'
import { isDimWishlistFormat, parseDimWishlist, getWishlistStats } from '@/services/dim-wishlist-parser'

const emit = defineEmits<{
  (e: 'imported'): void
}>()

const wishlistsStore = useWishlistsStore()

const isDragging = ref(false)
const importing = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const pendingContent = ref<string | null>(null)
const importName = ref('')

function handleDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file) {
    processFile(file)
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    processFile(file)
  }
  // Reset input so same file can be selected again
  input.value = ''
}

async function processFile(file: File) {
  error.value = null
  successMessage.value = null

  if (!file.name.endsWith('.txt')) {
    error.value = 'Please select a .txt file'
    return
  }

  try {
    const content = await file.text()

    if (!isDimWishlistFormat(content)) {
      error.value = 'This file does not appear to be a valid DIM wishlist format'
      return
    }

    // Parse to get suggested name
    const parsed = parseDimWishlist(content)
    pendingContent.value = content
    importName.value = parsed.title || file.name.replace('.txt', '')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to read file'
  }
}

function confirmImport() {
  if (!pendingContent.value || !importName.value.trim()) return

  importing.value = true
  error.value = null

  try {
    const wishlist = wishlistsStore.importDimFormat(pendingContent.value, importName.value.trim())
    const stats = getWishlistStats(wishlist.items)

    successMessage.value = `Imported "${wishlist.name}" with ${stats.itemCount.toLocaleString()} items across ${stats.weaponCount.toLocaleString()} weapons`
    pendingContent.value = null
    importName.value = ''

    emit('imported')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to import wishlist'
  } finally {
    importing.value = false
  }
}

function cancelImport() {
  pendingContent.value = null
  importName.value = ''
  error.value = null
}
</script>
