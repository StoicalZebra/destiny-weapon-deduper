<template>
  <div class="space-y-6 text-text">
    <div class="flex items-center justify-between bg-surface-elevated p-4 rounded-lg">
      <div class="space-y-1">
        <h3 class="text-xl font-bold text-text">Coverage Visualization</h3>
        <p class="text-sm text-text-muted">
          Hover over perks or instances to see the relationship
        </p>
      </div>

      <div class="flex items-center gap-1 bg-surface-overlay rounded-lg p-1">
        <button
          @click="visualMode = 'simple'"
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          :class="visualMode === 'simple'
            ? 'bg-green-600 text-white'
            : 'text-text-muted hover:text-text hover:bg-surface-elevated'"
          title="Shows all owned perks across all rolls"
        >
          Simple
        </button>
        <button
          @click="visualMode = 'detailed'"
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          :class="visualMode === 'detailed'
            ? 'bg-purple-600 text-white'
            : 'text-text-muted hover:text-text hover:bg-surface-elevated'"
          title="Shows 1 colored bar for each roll that has that perk"
        >
          Detailed
        </button>
      </div>
    </div>

    <!-- Wishlists Applied (compact toggle list) -->
    <div class="bg-surface-elevated/30 rounded-lg p-4 border border-border/50">
      <WishlistsApplied :weapon-hash="weapon.weaponHash" />
    </div>

    <!-- Unified Grid Layout for ALL Modes -->
    <div class="space-y-8">

      <!-- Perk Matrix (Punch Card) -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-lg">Perk Matrix (All Owned Rolls)</h4>
          <span class="text-xs uppercase tracking-wider text-text-subtle">{{ weapon.weaponName }}</span>
        </div>

        <div class="bg-surface border border-border rounded-lg overflow-hidden">
          <!-- Column Headers -->
          <div
            class="grid gap-px bg-surface-elevated border-b border-border"
            :style="{ gridTemplateColumns: `repeat(${matrixColumns.length}, minmax(5rem, 1fr))` }"
          >
            <div
              v-for="col in matrixColumns"
              :key="col.columnIndex"
              class="p-2 text-xs uppercase font-bold text-center text-text-muted tracking-wider truncate"
            >
              {{ col.columnName }}
            </div>
          </div>

          <!-- Matrix Content -->
          <div class="flex gap-2 p-2">
            <div
              v-for="column in matrixColumns"
              :key="column.columnIndex"
              class="flex-1 flex flex-col gap-1"
            >
              <div
                v-for="perk in getAvailablePerks(column)"
                :key="perk.hash"
                class="relative px-2 py-1.5 rounded-lg border cursor-pointer group transition-all duration-200"
                :class="getPerkRowClasses(perk)"
                @mouseenter="hoveredPerkHash = perk.hash"
                @mouseleave="hoveredPerkHash = null"
              >
                <!-- Segmented Bars Background -->
                <div v-if="visualMode === 'detailed'" class="absolute inset-0 flex h-full w-full opacity-30 rounded-lg overflow-hidden">
                  <div
                    v-for="instanceId in getInstancesWithPerk(perk.hash, column.columnIndex)"
                    :key="instanceId"
                    class="h-full flex-grow"
                    :style="{ backgroundColor: getInstanceColor(instanceId) }"
                  ></div>
                </div>

                <!-- Hover Overlay for Detailed -->
                <div
                  v-if="visualMode === 'detailed' && hoveredInstanceId && doesInstanceHavePerk(hoveredInstanceId, perk.hash, column.columnIndex)"
                  class="absolute inset-0 bg-white/10 border-2 border-white/50 rounded-lg"
                ></div>

                <!-- Content -->
                <div
                  class="relative z-10 flex items-center gap-1.5"
                  :title="getPerkTooltip(perk)"
                >
                   <div class="relative flex-shrink-0 ml-0.5 w-8 h-8">
                     <!-- Perk icon with ring indicator -->
                     <div
                       class="w-8 h-8 rounded-full overflow-hidden"
                       :class="getPerkIconClasses(perk)"
                     >
                       <img
                         v-if="perk.icon"
                         :src="`https://www.bungie.net${perk.icon}`"
                         class="w-full h-full object-cover"
                       />
                       <div v-else class="w-full h-full bg-surface-overlay"></div>
                     </div>
                    <!-- Wishlist thumbs-up indicator -->
                    <div
                      v-if="isWishlistPerk(perk.hash)"
                      class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                      </svg>
                    </div>
                   </div>
                  <span class="text-xs font-medium truncate select-none leading-tight" :class="perk.isOwned ? 'text-text' : 'text-text-subtle'">{{ perk.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Instances List (Below Matrix) -->
      <div class="space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h4 class="font-bold text-lg">In Your Inventory ({{ filteredAndSortedInstances.length }})</h4>
          <div class="flex items-center gap-2">
            <!-- Sort toggle -->
            <button
              @click="cycleSortOrder"
              class="px-2 py-1 text-xs font-medium rounded transition-colors"
              :class="sortOrder !== 'none' ? 'bg-surface-overlay text-text' : 'bg-surface-elevated text-text-muted hover:bg-surface-overlay'"
              title="Sort by tier"
            >
              {{ sortOrder === 'desc' ? '↓' : sortOrder === 'asc' ? '↑' : '−' }} Tier
            </button>
            <!-- Tier filter buttons -->
            <div class="flex gap-0.5 bg-surface-elevated rounded p-0.5">
              <button
                v-for="tier in [5, 4, 3, 2, 1]"
                :key="tier"
                @click="toggleTier(tier)"
                class="w-6 h-6 text-xs font-medium rounded transition-colors"
                :class="enabledTiers.has(tier) ? 'bg-surface-overlay text-text' : 'bg-surface-elevated text-text-subtle hover:text-text-muted'"
                :title="`Toggle Tier ${tier}`"
              >
                {{ tier }}
              </button>
              <button
                @click="toggleTier(null)"
                class="w-6 h-6 text-xs font-medium rounded transition-colors"
                :class="enabledTiers.has(null) ? 'bg-surface-overlay text-text' : 'bg-surface-elevated text-text-subtle hover:text-text-muted'"
                title="Toggle No Tier"
              >
                0
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <div
            v-for="(instance, index) in filteredAndSortedInstances"
            :key="instance.itemInstanceId"
            class="p-3 rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden"
            :class="getInstanceClasses(instance.itemInstanceId)"
            :style="getInstanceStyle(instance.itemInstanceId)"
            @mouseenter="hoveredInstanceId = instance.itemInstanceId"
            @mouseleave="hoveredInstanceId = null"
          >
            <div class="flex items-center justify-between mb-2 gap-1">
              <span class="font-bold text-xs">Copy {{ index + 1 }}</span>
              <span :class="getTierClass(instance.gearTier)" class="text-xs">{{ formatTier(instance.gearTier) }}</span>
            </div>

            <!-- DIM-style Perk Grid for Instance -->
            <InstancePerkGrid
              :instance="instance"
              :perk-matrix="weapon.perkMatrix"
              :wishlist-perk-annotations="wishlistPerkAnnotations"
              :highlighted-perks="hoveredPerkHash ? getHighlightedPerksForHover(hoveredPerkHash) : undefined"
            />
          </div>
        </div>
      </div>

    </div>

    <!-- Notes Section (shown for ALL modes) -->
    <div class="rounded-lg border border-border bg-surface/40 p-3">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-text-muted">Notes</h4>
      <div class="mt-2 space-y-2 text-sm">
        <div>
          <p class="text-xs text-text-subtle">Intrinsic Trait</p>
          <div v-if="weapon.intrinsicPerks.length" class="mt-1 flex flex-wrap gap-2">
            <span
              v-for="perk in weapon.intrinsicPerks"
              :key="perk.hash"
              :title="perk.description || perk.name"
              class="inline-flex items-center gap-2 rounded border border-border bg-surface/60 px-2 py-1 text-xs text-text cursor-help"
            >
              <img
                v-if="perk.icon"
                :src="`https://www.bungie.net${perk.icon}`"
                :alt="perk.name"
                class="h-4 w-4 rounded"
              />
              <span>{{ perk.name }}</span>
            </span>
          </div>
          <p v-else class="mt-1 text-xs text-text-subtle">None detected</p>
        </div>
        <div>
          <p class="text-xs text-text-subtle">Masterwork</p>
          <div v-if="weapon.masterworkPerks.length" class="mt-1 flex flex-wrap gap-2">
            <span
              v-for="perk in weapon.masterworkPerks"
              :key="perk.hash"
              :title="perk.description || perk.name"
              class="inline-flex items-center gap-2 rounded border border-border bg-surface/60 px-2 py-1 text-xs text-text cursor-help"
            >
              <img
                v-if="perk.icon"
                :src="`https://www.bungie.net${perk.icon}`"
                :alt="perk.name"
                class="h-4 w-4 rounded"
              />
              <span>{{ perk.name }}</span>
            </span>
          </div>
          <p v-else class="mt-1 text-xs text-text-subtle">None detected</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { DedupedWeapon, PerkColumn } from '@/models/deduped-weapon'
import type { Perk } from '@/models/perk'
import { useWishlistsStore } from '@/stores/wishlists'
import { getWishlistPerkAnnotations } from '@/services/dim-wishlist-parser'
import WishlistsApplied from './WishlistsApplied.vue'
import InstancePerkGrid from './InstancePerkGrid.vue'

const props = defineProps<{
  weapon: DedupedWeapon
}>()

// Wishlists store for perk annotations
const wishlistsStore = useWishlistsStore()

// Initialize store on mount
onMounted(async () => {
  if (!wishlistsStore.initialized) {
    await wishlistsStore.initialize(false)
  }
})

// Build a map from any perk hash to all its variants (for matching)
const perkVariantsMap = computed(() => {
  const map = new Map<number, number[]>()
  for (const col of props.weapon.perkMatrix) {
    for (const perk of col.availablePerks) {
      const variants = perk.variantHashes || [perk.hash]
      // Map each variant to all variants (including itself)
      for (const variantHash of variants) {
        map.set(variantHash, variants)
      }
      // Also map the primary hash
      map.set(perk.hash, variants)
    }
  }
  return map
})

// Get wishlist perk annotations for this weapon, expanded to include all variant hashes
const wishlistPerkAnnotations = computed(() => {
  const wishlistResults = wishlistsStore.getItemsForWeaponHash(props.weapon.weaponHash)
  const baseAnnotations = getWishlistPerkAnnotations(wishlistResults)

  // Expand annotations to include all variant hashes
  const expandedAnnotations = new Map<number, string[]>()
  for (const [perkHash, wishlistNames] of baseAnnotations) {
    // Add the original hash
    expandedAnnotations.set(perkHash, wishlistNames)
    // Add all variants of this perk
    const variants = perkVariantsMap.value.get(perkHash)
    if (variants) {
      for (const variantHash of variants) {
        const existing = expandedAnnotations.get(variantHash) || []
        for (const name of wishlistNames) {
          if (!existing.includes(name)) {
            existing.push(name)
          }
        }
        expandedAnnotations.set(variantHash, existing)
      }
    }
  }
  return expandedAnnotations
})

// Check if a perk is recommended by wishlists
const isWishlistPerk = (perkHash: number): boolean => {
  return wishlistPerkAnnotations.value.has(perkHash)
}

// Get tooltip for wishlist-recommended perks
const getWishlistTooltip = (perkHash: number): string => {
  const wishlists = wishlistPerkAnnotations.value.get(perkHash)
  if (!wishlists || wishlists.length === 0) return ''
  return `\n\nRecommended by: ${wishlists.join(', ')}`
}

// Get full tooltip for a perk (description + wishlist info)
const getPerkTooltip = (perk: Perk): string => {
  let tooltip = perk.description || perk.name
  tooltip += getWishlistTooltip(perk.hash)
  return tooltip
}

const visualMode = ref<'simple' | 'detailed'>('simple')
const hoveredPerkHash = ref<number | null>(null)
const hoveredInstanceId = ref<string | null>(null)

// Instance sorting and filtering
const sortOrder = ref<'desc' | 'asc' | 'none'>('desc')
const enabledTiers = ref<Set<number | null>>(new Set([1, 2, 3, 4, 5, null]))

const matrixColumns = computed(() => props.weapon.perkMatrix)

// Filter out retired perks that can no longer roll on current weapon versions
const getAvailablePerks = (column: PerkColumn) => {
  return column.availablePerks.filter(perk => !perk.cannotCurrentlyRoll)
}

// Filtered and sorted instances
// Note: gearTier of 0, null, or undefined all mean "no tier" (unranked)
const filteredAndSortedInstances = computed(() => {
  let instances = props.weapon.instances.filter(i => {
    const tier = i.gearTier || null // Treat 0 as null (no tier)
    return enabledTiers.value.has(tier)
  })

  if (sortOrder.value !== 'none') {
    instances = [...instances].sort((a, b) => {
      const tierA = a.gearTier ?? 0
      const tierB = b.gearTier ?? 0
      return sortOrder.value === 'desc' ? tierB - tierA : tierA - tierB
    })
  }

  return instances
})

// --- Color Palette ---
const PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
  '#84CC16', '#22C55E', '#14B8A6', '#0EA5E9', '#64748B'
]
const getInstanceColor = (instId: string) => {
  const idx = props.weapon.instances.findIndex(i => i.itemInstanceId === instId)
  if (idx === -1) return '#6B7280'
  return PALETTE[idx % PALETTE.length]
}

// --- Logic Helpers ---

// Check if an instance has a specific perk (by hash) in a specific column index
// Also checks all variant hashes (e.g., enhanced + non-enhanced versions)
const doesInstanceHavePerk = (instId: string, perkHash: number, colIndex: number): boolean => {
  const instance = props.weapon.instances.find(i => i.itemInstanceId === instId)
  if (!instance) return false

  // Get all variant hashes for this perk (enhanced + non-enhanced)
  const variants = perkVariantsMap.value.get(perkHash) || [perkHash]

  // Check active plug against all variants
  const activePlugHash = instance.sockets.sockets[colIndex]?.plugHash
  if (activePlugHash && variants.includes(activePlugHash)) return true

  // Check reusable plugs (selectable options) against all variants
  const reusables = instance.socketPlugsByIndex?.[colIndex]
  if (reusables && reusables.some(r => variants.includes(r))) return true

  return false
}

const getInstancesWithPerk = (perkHash: number, colIndex: number): string[] => {
  return props.weapon.instances
    .filter(inst => doesInstanceHavePerk(inst.itemInstanceId, perkHash, colIndex))
    .map(inst => inst.itemInstanceId)
}

// Get highlighted perks set for hover (includes variants)
const getHighlightedPerksForHover = (perkHash: number): Set<number> => {
  const variants = perkVariantsMap.value.get(perkHash) || [perkHash]
  return new Set(variants)
}

// --- Styling ---

const isPerkHighlighted = (perkHash: number) => {
  if (hoveredPerkHash.value === perkHash) return true
  if (hoveredInstanceId.value) {
    // We need to find which column this perk belongs to for accurate checking
    // But for visual highlight, just checking if instance has it ANYWHERE is likely okay, 
    // or we scan columns.
    
    // Optimized: We know the column in the template loop, but here we don't.
    // Let's iterate columns map or find it.
    for (const col of matrixColumns.value) {
       if (doesInstanceHavePerk(hoveredInstanceId.value, perkHash, col.columnIndex)) return true
    }
  }
  return false
}

// Row background and border classes (for hover states and ownership)
const getPerkRowClasses = (perk: Perk) => {
  // Hover states - match inventory card styling
  if (hoveredPerkHash.value === perk.hash) return 'bg-surface-overlay border-orange-400 ring-1 ring-orange-400'
  if (hoveredInstanceId.value) {
    // Instance is hovered - highlight its perks, dim others
    if (isPerkHighlighted(perk.hash)) return 'bg-surface-overlay/50 border-orange-400/50'
    return 'bg-surface-elevated border-border opacity-40'
  }
  // Unowned perks are dimmed
  if (!perk.isOwned) return 'bg-surface-elevated/30 border-border/50'
  return 'bg-surface-elevated border-border'
}

// Perk icon ring classes
const getPerkIconClasses = (perk: Perk) => {
  // Highlighted from hover
  if (hoveredPerkHash.value === perk.hash) {
    return 'ring-2 ring-orange-400 ring-offset-1 ring-offset-surface'
  }
  // Owned perk (white ring)
  if (perk.isOwned) {
    return 'ring-1 ring-white/80 ring-offset-1 ring-offset-surface'
  }
  // Not owned (dimmed with gray ring)
  return 'ring-1 ring-border opacity-40'
}

const instanceHasPerk = (instId: string, perkHash: number): boolean => {
  for (const col of matrixColumns.value) {
    if (doesInstanceHavePerk(instId, perkHash, col.columnIndex)) return true
  }
  return false
}

const getInstanceClasses = (instId: string) => {
  const base = 'bg-surface-elevated border-border'

  // Simple mode
  if (visualMode.value === 'simple') {
    if (hoveredInstanceId.value === instId) return 'bg-surface-overlay border-orange-400 ring-1 ring-orange-400'

    // Highlight if hovered perk is on this instance (subtle orange border)
    if (hoveredPerkHash.value) {
      if (instanceHasPerk(instId, hoveredPerkHash.value)) return 'bg-surface-overlay/50 border-orange-400/50'
      return 'opacity-50'
    }

    if (hoveredInstanceId.value && hoveredInstanceId.value !== instId) {
      return 'opacity-50'
    }

    return base
  }

  // Detailed mode
  if (hoveredInstanceId.value === instId) {
    return 'ring-2 ring-white border-transparent'
  }

  if (hoveredPerkHash.value) {
    if (instanceHasPerk(instId, hoveredPerkHash.value)) return 'bg-surface-overlay/50 border-orange-400/50'
    return 'opacity-40 grayscale-[0.5]'
  }

  if (hoveredInstanceId.value && hoveredInstanceId.value !== instId) {
    return 'opacity-40 grayscale-[0.5]'
  }

  return base
}

const getInstanceStyle = (instId: string) => {
  if (visualMode.value === 'detailed') {
    const color = getInstanceColor(instId)
    return {
      borderLeftWidth: '4px',
      borderLeftColor: color
    }
  }
  return {}
}

function formatTier(tier: number | null | undefined): string {
  if (!tier) {
    return 'No Tier'
  }
  const stars = '★'.repeat(tier)
  return `Tier ${tier} ${stars}`
}

function getTierClass(tier: number | null | undefined): string {
  if (!tier) {
    return 'text-text-subtle'
  }
  return 'text-text-muted'
}

// Sort and filter helpers
function cycleSortOrder() {
  const order: Record<string, 'desc' | 'asc' | 'none'> = { desc: 'asc', asc: 'none', none: 'desc' }
  sortOrder.value = order[sortOrder.value]
}

function toggleTier(tier: number | null) {
  if (enabledTiers.value.has(tier)) {
    enabledTiers.value.delete(tier)
  } else {
    enabledTiers.value.add(tier)
  }
  enabledTiers.value = new Set(enabledTiers.value) // trigger reactivity
}

</script>
