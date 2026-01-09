<template>
  <div class="space-y-6 text-gray-200">
    <div class="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
      <div class="space-y-1">
        <h3 class="text-xl font-bold text-white">Coverage Visualization</h3>
        <p class="text-sm text-gray-400">
          Hover over perks or instances to see the relationship
        </p>
      </div>

      <div class="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
        <button
          @click="visualMode = 'simple'"
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          :class="visualMode === 'simple'
            ? 'bg-green-600 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-600'"
          title="Shows all owned perks across all rolls"
        >
          Simple
        </button>
        <button
          @click="visualMode = 'detailed'"
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          :class="visualMode === 'detailed'
            ? 'bg-purple-600 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-600'"
          title="Shows 1 colored bar for each roll that has that perk"
        >
          Detailed
        </button>
      </div>
    </div>

    <!-- Unified Grid Layout for ALL Modes -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
      
      <!-- Left: Perk Matrix (Punch Card) -->
      <div class="xl:col-span-2 space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-lg">Perk Matrix</h4>
          <span class="text-xs uppercase tracking-wider text-gray-500">{{ weapon.weaponName }}</span>
        </div>

        <div class="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          <!-- Column Headers -->
          <div 
            class="grid gap-px bg-gray-800 border-b border-gray-700" 
            :style="{ gridTemplateColumns: `repeat(${matrixColumns.length}, minmax(0, 1fr))` }"
          >
            <div 
              v-for="col in matrixColumns" 
              :key="col.columnIndex"
              class="p-2 text-[10px] uppercase font-bold text-center text-gray-400 tracking-wider truncate"
            >
              {{ col.columnName }}
            </div>
          </div>

          <!-- Matrix Content -->
          <div class="flex">
            <div 
              v-for="column in matrixColumns" 
              :key="column.columnIndex"
              class="flex-1 border-r border-gray-800 last:border-r-0"
            >
              <div 
                v-for="perk in column.availablePerks" 
                :key="perk.hash"
                class="relative h-10 border-b border-gray-800 last:border-b-0 cursor-pointer group transition-colors duration-200"
                :class="getPerkClasses(perk)"
                @mouseenter="hoveredPerkHash = perk.hash"
                @mouseleave="hoveredPerkHash = null"
              >
                <!-- Segmented Bars Background -->
                <div v-if="visualMode === 'detailed'" class="absolute inset-0 flex h-full w-full opacity-30">
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
                  class="absolute inset-0 bg-white/10 border-2 border-white/50"
                ></div>
                
                <!-- Content -->
                <div
                  class="relative z-10 flex items-center h-full px-2 gap-1.5 overflow-hidden"
                  :title="perk.description || perk.name"
                >
                   <img
                    v-if="perk.icon"
                    :src="`https://www.bungie.net${perk.icon}`"
                    class="w-5 h-5 rounded flex-shrink-0"
                  />
                  <div v-else class="w-5 h-5 rounded bg-gray-700 flex-shrink-0"></div>
                  <span class="text-[10px] font-medium truncate select-none leading-tight">{{ perk.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Instances List -->
      <div class="space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h4 class="font-bold text-lg">Instances ({{ filteredAndSortedInstances.length }})</h4>
          <div class="flex items-center gap-2">
            <!-- Sort toggle -->
            <button
              @click="cycleSortOrder"
              class="px-2 py-1 text-xs font-medium rounded transition-colors"
              :class="sortOrder !== 'none' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
              title="Sort by tier"
            >
              {{ sortOrder === 'desc' ? '↓' : sortOrder === 'asc' ? '↑' : '−' }} Tier
            </button>
            <!-- Tier filter buttons -->
            <div class="flex gap-0.5 bg-gray-800 rounded p-0.5">
              <button
                v-for="tier in [5, 4, 3, 2, 1]"
                :key="tier"
                @click="toggleTier(tier)"
                class="w-6 h-6 text-xs font-medium rounded transition-colors"
                :class="enabledTiers.has(tier) ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-600 hover:text-gray-400'"
                :title="`Toggle Tier ${tier}`"
              >
                {{ tier }}
              </button>
              <button
                @click="toggleTier(null)"
                class="w-6 h-6 text-xs font-medium rounded transition-colors"
                :class="enabledTiers.has(null) ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-600 hover:text-gray-400'"
                title="Toggle No Tier"
              >
                ?
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="(instance, index) in filteredAndSortedInstances" 
            :key="instance.itemInstanceId"
            class="p-3 rounded-lg border transition-all duration-200 cursor-pointer"
            :class="getInstanceClasses(instance.itemInstanceId)"
            :style="getInstanceStyle(instance.itemInstanceId)"
            @mouseenter="hoveredInstanceId = instance.itemInstanceId"
            @mouseleave="hoveredInstanceId = null"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-sm">Copy {{ index + 1 }}</span>
              <span :class="getTierClass(instance.gearTier)" class="text-xs">{{ formatTier(instance.gearTier) }}</span>
              <span class="text-[10px] text-gray-500 font-mono">{{ instance.itemInstanceId }}</span>
            </div>
            
            <!-- Full Perk Matrix Tags for Instance -->
            <div class="flex flex-wrap gap-1 min-w-0">
               <template v-for="col in matrixColumns" :key="col.columnIndex">
                  <span
                    v-for="perkHash in getPerksForInstanceInColumn(instance, col.columnIndex)"
                    :key="perkHash"
                    class="text-[9px] px-1 py-0.5 bg-black/20 rounded text-gray-400 truncate text-center"
                    :class="{
                      'text-white bg-white/20 font-bold ring-1 ring-white/30': hoveredPerkHash && isPerkVariantMatch(hoveredPerkHash, perkHash),
                      'text-gray-300': !hoveredPerkHash
                    }"
                    :title="getPerkName(perkHash)"
                  >
                    {{ getPerkName(perkHash) }}
                  </span>
               </template>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Notes Section (shown for ALL modes) -->
    <div class="rounded-lg border border-gray-700 bg-gray-900/40 p-3">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</h4>
      <div class="mt-2 space-y-2 text-sm">
        <div>
          <p class="text-xs text-gray-500">Intrinsic Trait</p>
          <div v-if="weapon.intrinsicPerks.length" class="mt-1 flex flex-wrap gap-2">
            <span
              v-for="perk in weapon.intrinsicPerks"
              :key="perk.hash"
              :title="perk.description || perk.name"
              class="inline-flex items-center gap-2 rounded border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-gray-200 cursor-help"
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
          <p v-else class="mt-1 text-xs text-gray-500">None detected</p>
        </div>
        <div>
          <p class="text-xs text-gray-500">Masterwork</p>
          <div v-if="weapon.masterworkPerks.length" class="mt-1 flex flex-wrap gap-2">
            <span
              v-for="perk in weapon.masterworkPerks"
              :key="perk.hash"
              :title="perk.description || perk.name"
              class="inline-flex items-center gap-2 rounded border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-gray-200 cursor-help"
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
          <p v-else class="mt-1 text-xs text-gray-500">None detected</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DedupedWeapon } from '@/models/deduped-weapon'
import type { WeaponInstance } from '@/models/weapon-instance'
import type { Perk } from '@/models/perk'
import { manifestService } from '@/services/manifest-service'

const props = defineProps<{
  weapon: DedupedWeapon
}>()

const visualMode = ref<'simple' | 'detailed'>('simple')
const hoveredPerkHash = ref<number | null>(null)
const hoveredInstanceId = ref<string | null>(null)

// Instance sorting and filtering
const sortOrder = ref<'desc' | 'asc' | 'none'>('desc')
const enabledTiers = ref<Set<number | null>>(new Set([1, 2, 3, 4, 5, null]))

const matrixColumns = computed(() => props.weapon.perkMatrix)

// Filtered and sorted instances
const filteredAndSortedInstances = computed(() => {
  let instances = props.weapon.instances.filter(i =>
    enabledTiers.value.has(i.gearTier ?? null)
  )

  if (sortOrder.value !== 'none') {
    instances = [...instances].sort((a, b) => {
      const tierA = a.gearTier ?? 0
      const tierB = b.gearTier ?? 0
      return sortOrder.value === 'desc' ? tierB - tierA : tierA - tierB
    })
  }

  return instances
})

// Build a map from any perk hash to all its variants (for hover matching)
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

// Check if two perk hashes are variants of each other (e.g., enhanced vs non-enhanced)
const isPerkVariantMatch = (hash1: number, hash2: number): boolean => {
  if (hash1 === hash2) return true
  const variants = perkVariantsMap.value.get(hash1)
  return variants ? variants.includes(hash2) : false
}

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

const getPerksForInstanceInColumn = (instance: WeaponInstance, colIndex: number): number[] => {
   const perks = new Set<number>()
   // Active
   const active = instance.sockets.sockets[colIndex]?.plugHash
   if (active) perks.add(active)
   
   // Selectable
   const reusables = instance.socketPlugsByIndex?.[colIndex]
   if (reusables) reusables.forEach(p => perks.add(p))
   
   return Array.from(perks)
}

// Name lookup helper
const perkNameCache = new Map<number, string>()
const getPerkName = (hash: number) => {
  if (perkNameCache.has(hash)) return perkNameCache.get(hash)

  // Search in matrix first
  for (const col of props.weapon.perkMatrix) {
    const p = col.availablePerks.find(p => p.hash === hash)
    if (p) {
        perkNameCache.set(hash, p.name)
        return p.name
    }
  }

  // Fallback to manifest lookup for perks not in matrix
  const perkDef = manifestService.getInventoryItem(hash)
  if (perkDef?.displayProperties?.name) {
    perkNameCache.set(hash, perkDef.displayProperties.name)
    return perkDef.displayProperties.name
  }

  return 'Unknown'
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

const getPerkClasses = (perk: Perk) => {
  // Simple mode - show owned perks with green tint
  if (visualMode.value === 'simple') {
    if (hoveredPerkHash.value === perk.hash) return 'bg-green-600/40'
    if (hoveredInstanceId.value) {
      // Instance is hovered - highlight its perks, dim others
      if (isPerkHighlighted(perk.hash)) return 'bg-green-600/30'
      return 'bg-gray-800/50 opacity-40'
    }
    if (perk.isOwned) return 'bg-green-900/40'
    return 'bg-gray-800'
  }

  // Detailed mode - ownership shown via colored bars
  if (hoveredInstanceId.value) {
    // Instance is hovered - highlight its perks, dim others
    if (isPerkHighlighted(perk.hash)) return 'bg-gray-600'
    return 'bg-gray-800/50 opacity-40'
  }
  if (perk.isOwned) return 'bg-gray-700'
  return 'bg-gray-800'
}

const instanceHasPerk = (instId: string, perkHash: number): boolean => {
  for (const col of matrixColumns.value) {
    if (doesInstanceHavePerk(instId, perkHash, col.columnIndex)) return true
  }
  return false
}

const getInstanceClasses = (instId: string) => {
  const base = 'bg-gray-800 border-gray-700'

  // Simple mode - green highlights
  if (visualMode.value === 'simple') {
    if (hoveredInstanceId.value === instId) return 'bg-green-900 border-green-500 ring-1 ring-green-500'

    // Highlight if hovered perk is on this instance
    if (hoveredPerkHash.value) {
      if (instanceHasPerk(instId, hoveredPerkHash.value)) return 'bg-green-900/50 border-green-500/50'
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
    if (instanceHasPerk(instId, hoveredPerkHash.value)) return 'brightness-110 ring-1 ring-white/50'
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
  if (tier == null) {
    return 'No Tier'
  }
  const stars = '★'.repeat(tier)
  return `Tier ${tier} ${stars}`
}

function getTierClass(tier: number | null | undefined): string {
  if (tier == null) {
    return 'text-gray-600'
  }
  return 'text-gray-400'
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
