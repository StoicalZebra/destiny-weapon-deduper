<template>
  <div class="max-w-6xl mx-auto">
    <!-- Back Link -->
    <router-link
      to="/wishlists"
      class="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-4"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Wishlists
    </router-link>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <svg class="h-8 w-8 mx-auto animate-spin text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <!-- Not Found -->
    <div v-else-if="!wishlist" class="text-center py-12">
      <p class="text-text-muted">Wishlist not found</p>
      <router-link to="/wishlists" class="text-accent-primary hover:text-accent-primary/80 text-sm mt-2 inline-block">
        View all wishlists
      </router-link>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="rounded-xl border border-border bg-surface-elevated p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 flex-wrap">
              <!-- Editable name for user wishlists -->
              <input
                v-if="wishlist.sourceType === 'user'"
                v-model="editableName"
                @blur="saveName"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
                class="text-2xl font-bold bg-transparent border-b-2 border-transparent hover:border-border focus:border-accent-primary focus:outline-none transition-colors max-w-md"
                :class="{ 'text-text': editableName, 'text-text-muted': !editableName }"
                placeholder="Wishlist Name"
              />
              <h1 v-else class="text-2xl font-bold">{{ wishlist.name }}</h1>
              <span
                :class="[
                  'text-xs px-2 py-0.5 rounded-full',
                  wishlist.sourceType === 'preset'
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700/50'
                    : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700/50'
                ]"
              >
                {{ wishlist.sourceType === 'preset' ? 'Premade' : 'Custom' }}
              </span>
            </div>
            <!-- Editable description for user wishlists -->
            <textarea
              v-if="wishlist.sourceType === 'user'"
              v-model="editableDescription"
              @blur="saveDescription"
              rows="2"
              class="mt-2 w-full text-text-muted bg-transparent border-b-2 border-transparent hover:border-border focus:border-accent-primary focus:outline-none transition-colors resize-none"
              placeholder="Add a description..."
            />
            <p v-else-if="wishlist.description" class="mt-2 text-text-muted">
              {{ wishlist.description }}
            </p>
            <p v-if="wishlist.author" class="mt-1 text-sm text-text-subtle">
              by {{ wishlist.author }}
            </p>
          </div>

          <div class="flex gap-2 flex-shrink-0">
            <!-- Fork button for preset wishlists -->
            <button
              v-if="wishlist.sourceType === 'preset'"
              @click="showForkModal = true"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-600/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-600/40 transition-colors text-sm"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Fork to Custom
            </button>
            <!-- Export as Canonical (dev only, StoicalZebra only) -->
            <button
              v-if="canExportAsCanonical"
              @click="handleExportAsCanonical"
              :disabled="exportingCanonical"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-600/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-600/40 disabled:opacity-50 transition-colors text-sm"
              title="Write directly to data/wishlists/StoicalZebra-wishlist.txt (dev only)"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {{ exportingCanonical ? 'Saving...' : 'Save as Canonical' }}
            </button>
            <button
              @click="handleExport"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-overlay text-text hover:bg-surface-elevated transition-colors text-sm"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="mt-4 flex gap-6 text-sm">
          <div>
            <span class="text-text-subtle">Items:</span>
            <span class="ml-1 font-medium text-text">{{ stats.itemCount.toLocaleString() }}</span>
          </div>
          <div>
            <span class="text-text-subtle">Weapons:</span>
            <span class="ml-1 font-medium text-text">{{ stats.weaponCount.toLocaleString() }}</span>
          </div>
          <div v-if="wishlist.lastUpdated">
            <span class="text-text-subtle">Updated:</span>
            <span class="ml-1 font-medium text-text">{{ formatDate(wishlist.lastUpdated) }}</span>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div class="mb-6">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by weapon name or notes..."
          class="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-text placeholder-text-subtle focus:outline-none focus:border-accent-primary"
        />
      </div>

      <!-- Items grouped by weapon -->
      <div class="space-y-4">
        <div
          v-for="[weaponHash, items] in filteredGroups"
          :key="weaponHash"
          class="rounded-xl border border-border bg-surface-elevated p-4"
        >
          <!-- Weapon Header -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-3 min-w-0">
              <img
                v-if="getWeaponIcon(weaponHash)"
                :src="`https://www.bungie.net${getWeaponIcon(weaponHash)}`"
                :alt="getWeaponName(weaponHash)"
                class="w-10 h-10 rounded"
              />
              <div v-else class="w-10 h-10 rounded bg-surface-overlay flex items-center justify-center">
                <span class="text-text-subtle text-xs">?</span>
              </div>
              <div class="min-w-0 flex-1 grid grid-cols-2 gap-x-4 items-end">
                <!-- Left column: Name + Rolls -->
                <div class="min-w-0 flex flex-col justify-end">
                  <h3 class="font-semibold text-text truncate">{{ getWeaponName(weaponHash) }}</h3>
                  <p class="text-xs text-text-subtle">{{ items.length }} {{ items.length === 1 ? 'roll' : 'rolls' }}</p>
                </div>
                <!-- Right column: Season + Hashes (left-aligned, bottom-aligned) -->
                <div class="flex flex-col justify-end">
                  <p v-if="getWeaponSeasonName(weaponHash)" class="text-xs text-text-subtle">{{ getWeaponSeasonName(weaponHash) }}</p>
                  <!-- Show all variant hashes if multiple exist -->
                  <div v-if="getWeaponVariants(weaponHash).length > 1" class="text-xs text-text-subtle">
                    <div v-for="variant in getWeaponVariants(weaponHash)" :key="variant.hash" class="flex items-center gap-1">
                      <span v-if="variant.isHolofoil" class="text-purple-400">Holofoil</span>
                      <span v-else>Normal</span>
                      <span class="font-mono">...{{ formatHashSuffix(variant.hash) }}</span>
                    </div>
                  </div>
                  <!-- Single hash display for weapons without variants -->
                  <p v-else class="text-xs text-text-subtle font-mono">Hash ...{{ formatHashSuffix(weaponHash) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Items for this weapon -->
          <div :class="[
            'grid gap-2',
            useConsolidation
              ? 'grid-cols-1 lg:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          ]">
            <!-- Consolidated view for large preset wishlists (Voltron, JAT-MnK) -->
            <template v-if="useConsolidation">
              <ConsolidatedRollCard
                :consolidated="consolidatedGroups.get(weaponHash)!"
                :weapon-hash="weaponHash"
                :wishlist-name="wishlist?.name || 'Unknown'"
                action-label="View"
                @action="handleViewWeapon(weaponHash)"
              />
            </template>
            <!-- Individual cards for other wishlists (StoicalZebra, user wishlists) -->
            <template v-else>
              <WishlistRollCard
                v-for="item in items"
                :key="item.id"
                :item="item"
                :weapon-hash="weaponHash"
                :wishlist-name="wishlist?.name || 'Unknown'"
                :show-actions="isEditable"
                @view="handleViewItem(item, weaponHash)"
                @edit="handleEditItem(item, weaponHash)"
                @remove="handleDeleteItem(item.id)"
              />
            </template>
          </div>
        </div>
      </div>

      <!-- Load More Button -->
      <div v-if="hasMoreGroups" class="text-center py-6">
        <button
          @click="loadMore"
          class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          Load More ({{ remainingCount.toLocaleString() }} weapons remaining)
        </button>
      </div>

      <!-- Empty search results -->
      <div v-if="filteredGroups.length === 0 && searchQuery" class="text-center py-12">
        <p class="text-text-muted">No items match "{{ searchQuery }}"</p>
      </div>

      <!-- Empty wishlist -->
      <div v-if="wishlist.items.length === 0" class="text-center py-12">
        <p class="text-text-muted">This wishlist is empty.</p>
      </div>
    </template>

    <!-- Fork Modal -->
    <div
      v-if="showForkModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="showForkModal = false"
    >
      <div class="w-full max-w-md rounded-xl bg-surface-elevated border border-border p-6">
        <h2 class="text-xl font-semibold text-text mb-2">Fork to Custom Wishlist</h2>
        <p class="text-sm text-text-muted mb-4">
          Create your own copy that you can edit freely. The original premade wishlist will remain unchanged.
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Name</label>
            <input
              v-model="forkName"
              type="text"
              placeholder="My forked wishlist"
              class="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-border text-text placeholder-text-subtle focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Description (optional)</label>
            <textarea
              v-model="forkDescription"
              rows="2"
              :placeholder="`Based on ${wishlist?.name || 'premade wishlist'}`"
              class="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-border text-text placeholder-text-subtle focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button
            @click="showForkModal = false"
            class="px-4 py-2 rounded-lg bg-surface-overlay text-text-muted hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleFork"
            :disabled="!forkName.trim() || forking"
            class="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
          >
            {{ forking ? 'Creating...' : 'Create Copy' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Saved Toast -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="savedMessage"
        class="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white shadow-lg"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        {{ savedMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWishlistsStore } from '@/stores/wishlists'
import { manifestService } from '@/services/manifest-service'
import { weaponParser } from '@/services/weapon-parser'
import { getWishlistStats } from '@/services/dim-wishlist-parser'
import WishlistRollCard from '@/components/wishlists/WishlistRollCard.vue'
import ConsolidatedRollCard from '@/components/wishlists/ConsolidatedRollCard.vue'
import type { WishlistItem, ConsolidatedWishlistItem } from '@/models/wishlist'
import { formatHashSuffix } from '@/utils/formatting'
import { sortItemsByTagPriority } from '@/utils/wishlist-sorting'
import {
  shouldConsolidateWishlist,
  consolidateWishlistItems,
  groupItemsByWeaponName
} from '@/utils/wishlist-consolidation'

const route = useRoute()
const router = useRouter()
const wishlistsStore = useWishlistsStore()

const loading = ref(true)
const searchQuery = ref('')
const displayLimit = ref(50) // Start with 50 weapons, load more on scroll

// Dev mode detection for canonical export
const isDevMode = ref(false)
const exportingCanonical = ref(false)

// Editable fields for user wishlists
const editableName = ref('')
const editableDescription = ref('')

// Fork modal state
const showForkModal = ref(false)
const forkName = ref('')
const forkDescription = ref('')
const forking = ref(false)

// Get wishlist
const wishlist = computed(() => {
  const id = route.params.id as string
  return wishlistsStore.getWishlistById(id)
})

// Stats
const stats = computed(() => {
  if (!wishlist.value) return { itemCount: 0, weaponCount: 0 }
  return getWishlistStats(wishlist.value.items)
})

// Check if this wishlist is editable (user wishlists)
const isEditable = computed(() => {
  if (!wishlist.value) return false
  // Only user wishlists are directly editable
  // Premade wishlists require forking first
  return wishlist.value.sourceType === 'user'
})

// Check if this wishlist can be exported as canonical (dev mode + user/custom wishlists)
// Workflow: Fork StoicalZebra preset → Edit custom copy → Save as Canonical
const canExportAsCanonical = computed(() => {
  if (!wishlist.value || !isDevMode.value) return false
  return wishlist.value.sourceType === 'user'
})

// Consolidation: merge multiple items per weapon into single view for large preset wishlists
const useConsolidation = computed(() => {
  return wishlist.value ? shouldConsolidateWishlist(wishlist.value) : false
})

// Group items by weapon, sorted by tag priority within each group
// When consolidation is enabled, group by canonical hash (merges weapon variants)
const groupedByWeapon = computed(() => {
  if (!wishlist.value) return new Map<number, WishlistItem[]>()

  // Use name-based grouping when consolidating (merges all variants + seasonal re-releases)
  // Otherwise use direct hash grouping (preserves individual variant entries)
  const groups = useConsolidation.value
    ? groupItemsByWeaponName(wishlist.value.items)
    : (() => {
        const map = new Map<number, WishlistItem[]>()
        for (const item of wishlist.value!.items) {
          const existing = map.get(item.weaponHash) || []
          existing.push(item)
          map.set(item.weaponHash, existing)
        }
        return map
      })()

  // Sort items within each group by tag priority
  for (const [hash, items] of groups) {
    groups.set(hash, sortItemsByTagPriority(items))
  }

  return groups
})

// Pre-compute consolidated items for each weapon (only when consolidation is enabled)
const consolidatedGroups = computed(() => {
  if (!wishlist.value || !useConsolidation.value) {
    return new Map<number, ConsolidatedWishlistItem>()
  }

  const groups = new Map<number, ConsolidatedWishlistItem>()
  for (const [weaponHash, items] of groupedByWeapon.value) {
    groups.set(weaponHash, consolidateWishlistItems(items))
  }
  return groups
})

// Filter by search
const allFilteredGroups = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) {
    return Array.from(groupedByWeapon.value.entries())
  }

  return Array.from(groupedByWeapon.value.entries()).filter(([weaponHash, items]) => {
    const weaponName = getWeaponName(weaponHash).toLowerCase()
    if (weaponName.includes(query)) return true

    // Check item notes
    return items.some((item) => item.notes?.toLowerCase().includes(query))
  })
})

// Paginated groups - only show up to displayLimit weapons at a time
const filteredGroups = computed(() => {
  return allFilteredGroups.value.slice(0, displayLimit.value)
})

// Check if there are more to load
const hasMoreGroups = computed(() => {
  return allFilteredGroups.value.length > displayLimit.value
})

const remainingCount = computed(() => {
  return allFilteredGroups.value.length - displayLimit.value
})

// Toast notification for saved changes
const savedMessage = ref<string | null>(null)
let savedTimeout: ReturnType<typeof setTimeout> | null = null

function showSavedToast(message: string) {
  if (savedTimeout) clearTimeout(savedTimeout)
  savedMessage.value = message
  savedTimeout = setTimeout(() => {
    savedMessage.value = null
  }, 2000)
}

function loadMore() {
  displayLimit.value += 50
}

// Reset pagination when search changes
watch(searchQuery, () => {
  displayLimit.value = 50
})

// Initialize
onMounted(async () => {
  if (!wishlistsStore.initialized) {
    await wishlistsStore.initialize()
  }
  loading.value = false

  // Initialize editable fields for user wishlists
  if (wishlist.value?.sourceType === 'user') {
    editableName.value = wishlist.value.name
    editableDescription.value = wishlist.value.description || ''
  }

  // Check if dev API is available
  try {
    const response = await fetch('/api/wishlist/is-dev')
    if (response.ok) {
      const data = await response.json()
      isDevMode.value = data.isDev === true
    }
  } catch {
    // Not in dev mode or API not available
    isDevMode.value = false
  }
})

// Watch for wishlist changes to update editable fields
watch(wishlist, (newWishlist) => {
  if (newWishlist?.sourceType === 'user') {
    editableName.value = newWishlist.name
    editableDescription.value = newWishlist.description || ''
  }
})

// Helpers
function getWeaponName(hash: number): string {
  const def = manifestService.getInventoryItem(hash)
  return def?.displayProperties?.name || `Unknown (${hash})`
}

function getWeaponIcon(hash: number): string | null {
  const def = manifestService.getInventoryItem(hash)
  return def?.displayProperties?.icon || null
}

function getWeaponSeasonName(hash: number): string | undefined {
  return weaponParser.getWeaponSeasonName(hash)
}

// Get all variant hashes for a weapon (e.g., holofoil + normal)
function getWeaponVariants(hash: number): Array<{ hash: number; isHolofoil: boolean }> {
  const variantHashes = manifestService.getWeaponVariantHashes(hash)
  return variantHashes.map(h => ({
    hash: h,
    isHolofoil: manifestService.isHolofoilWeapon(h)
  }))
}

function formatDate(isoString?: string): string {
  if (!isoString) return 'Unknown'
  const date = new Date(isoString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Name/description save handlers
function saveName() {
  if (!wishlist.value || wishlist.value.sourceType !== 'user') return
  const trimmed = editableName.value.trim()
  if (trimmed && trimmed !== wishlist.value.name) {
    wishlistsStore.updateUserWishlist(wishlist.value.id, { name: trimmed })
    showSavedToast('Name saved')
  } else {
    // Reset to original if empty
    editableName.value = wishlist.value.name
  }
}

function saveDescription() {
  if (!wishlist.value || wishlist.value.sourceType !== 'user') return
  const trimmed = editableDescription.value.trim()
  if (trimmed !== (wishlist.value.description || '')) {
    wishlistsStore.updateUserWishlist(wishlist.value.id, { description: trimmed || undefined })
    showSavedToast('Description saved')
  }
}

// Fork handler
async function handleFork() {
  if (!wishlist.value || !forkName.value.trim()) return

  forking.value = true
  try {
    const forked = await wishlistsStore.forkPreset(
      wishlist.value.id,
      forkName.value.trim(),
      forkDescription.value.trim() || undefined
    )

    if (forked) {
      // Close modal and navigate to the new forked wishlist
      showForkModal.value = false
      forkName.value = ''
      forkDescription.value = ''
      router.replace({ params: { id: forked.id } })
    }
  } finally {
    forking.value = false
  }
}

// Actions
function handleExport() {
  if (!wishlist.value) return

  const content = wishlistsStore.exportToDimFormat(wishlist.value.id)
  if (!content) return

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${wishlist.value.name.replace(/[^a-z0-9]/gi, '_')}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Export as canonical (dev only) - writes directly to data/wishlists/StoicalZebra-wishlist.txt
async function handleExportAsCanonical() {
  if (!wishlist.value || !canExportAsCanonical.value) return

  exportingCanonical.value = true
  try {
    const content = wishlistsStore.exportToDimFormat(wishlist.value.id)
    if (!content) {
      showSavedToast('Error: Could not export wishlist')
      return
    }

    const response = await fetch('/api/wishlist/canonical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })

    if (response.ok) {
      showSavedToast('Saved to StoicalZebra-wishlist.txt (previous version archived)')
    } else {
      const error = await response.json()
      showSavedToast(`Error: ${error.error || 'Failed to save'}`)
    }
  } catch (error) {
    showSavedToast(`Error: ${String(error)}`)
  } finally {
    exportingCanonical.value = false
  }
}

function handleDeleteItem(itemId: string) {
  if (!wishlist.value || wishlist.value.sourceType !== 'user') return
  wishlistsStore.removeItemFromWishlist(wishlist.value.id, itemId)
}

function handleViewItem(_item: WishlistItem, weaponHash: number) {
  // Navigate to weapon detail page (view mode)
  router.push({
    name: 'weapon-detail',
    params: { weaponHash: weaponHash.toString() }
  })
}

function handleViewWeapon(weaponHash: number) {
  // Navigate to weapon detail page (for consolidated cards)
  router.push({
    name: 'weapon-detail',
    params: { weaponHash: weaponHash.toString() }
  })
}

function handleEditItem(item: WishlistItem, weaponHash: number) {
  if (!wishlist.value) return
  // Navigate to weapon detail page with edit params
  router.push({
    name: 'weapon-detail',
    params: { weaponHash: weaponHash.toString() },
    query: {
      tab: 'editrolls',
      editItemId: item.id,
      wishlistId: wishlist.value.id
    }
  })
}
</script>
