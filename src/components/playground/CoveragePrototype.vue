<template>
  <div class="space-y-6 text-gray-200">
    <div class="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
      <div class="space-y-1">
        <h3 class="text-xl font-bold text-white">Coverage Visualization Prototype</h3>
        <p class="text-sm text-gray-400">Hover over perks or instances to see the relationship</p>
      </div>
      
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <span class="text-sm font-medium">Visualization Mode:</span>
          <select 
            v-model="visualMode"
            class="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="simple">Simple Highlight</option>
            <option value="segmented">Segmented Bars</option>
          </select>
        </label>
      </div>
    </div>

    <!-- Main Grid Layout -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
      
      <!-- Left: Perk Matrix (Punch Card) -->
      <div class="xl:col-span-2 space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-lg">Perk Matrix</h4>
          <span class="text-xs uppercase tracking-wider text-gray-500">Anonymous Autumn (Sidearm)</span>
        </div>

        <div class="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          <!-- Column Headers -->
          <div class="grid grid-cols-6 gap-px bg-gray-800 border-b border-gray-700">
            <div 
              v-for="header in COLUMN_HEADERS" 
              :key="header"
              class="p-2 text-[10px] uppercase font-bold text-center text-gray-400 tracking-wider"
            >
              {{ header }}
            </div>
          </div>

          <!-- Matrix Content -->
          <div class="flex">
            <div 
              v-for="(column, colIndex) in matrixColumns" 
              :key="colIndex"
              class="flex-1 border-r border-gray-800 last:border-r-0"
            >
              <div 
                v-for="perk in column.perks" 
                :key="perk.id"
                class="relative h-10 border-b border-gray-800 last:border-b-0 cursor-pointer group transition-colors duration-200"
                :class="getPerkClasses(perk)"
                @mouseenter="hoveredPerkId = perk.id"
                @mouseleave="hoveredPerkId = null"
              >
                <!-- Simple Highlight Background -->
                <div 
                  v-if="visualMode === 'simple' && isPerkHighlighted(perk)"
                  class="absolute inset-0 bg-blue-500/20"
                ></div>

                <!-- Segmented Bars Background -->
                <div v-if="visualMode === 'segmented'" class="absolute inset-0 flex h-full w-full opacity-30">
                  <div 
                    v-for="instanceId in perk.instanceIds"
                    :key="instanceId"
                    class="h-full flex-grow"
                    :style="{ backgroundColor: getInstanceColor(instanceId) }"
                  ></div>
                </div>

                <!-- Hover Overlay for Segmented -->
                <div 
                  v-if="visualMode === 'segmented' && hoveredInstanceId && perk.instanceIds.includes(hoveredInstanceId)"
                  class="absolute inset-0 bg-white/10 border-2 border-white/50"
                ></div>
                
                <!-- Content -->
                <div class="relative z-10 flex items-center h-full px-2 gap-1.5 overflow-hidden">
                  <!-- Fake Icon -->
                  <div class="w-5 h-5 rounded bg-gray-700 flex-shrink-0"></div>
                  <span class="text-[10px] font-medium truncate select-none leading-tight">{{ perk.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Instances List -->
      <div class="space-y-4">
        <h4 class="font-bold text-lg">Instances ({{ instances.length }})</h4>
        
        <div class="space-y-2">
          <div 
            v-for="instance in instances" 
            :key="instance.id"
            class="p-3 rounded-lg border transition-all duration-200 cursor-pointer"
            :class="getInstanceClasses(instance)"
            :style="getInstanceStyle(instance)"
            @mouseenter="hoveredInstanceId = instance.id"
            @mouseleave="hoveredInstanceId = null"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-sm">{{ instance.name }}</span>
              <span class="text-xs px-1.5 py-0.5 rounded bg-black/30 font-mono">{{ instance.power }}</span>
            </div>
            
            <!-- Full Perk Matrix Tags for Instance -->
            <div class="flex flex-wrap gap-1 min-w-0">
               <span 
                v-for="(perkId, idx) in instance.perks" 
                :key="idx"
                class="text-[9px] px-1 py-0.5 bg-black/20 rounded text-gray-400 truncate text-center"
                :class="{ 
                  'text-white bg-white/20 font-bold ring-1 ring-white/30': hoveredPerkId && instanceHasPerk(instance, hoveredPerkId) && hoveredPerkId === perkId,
                  'text-gray-300': !hoveredPerkId
                }"
                :title="getPerkNameById(perkId)"
              >
                {{ getPerkNameById(perkId) }}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ALL_PERKS, MOCK_INSTANCES, COLUMN_HEADERS, INSTANCE_COLORS, type MockPerk, type MockInstance } from './mock-data'

const visualMode = ref<'simple' | 'segmented'>('simple')
const hoveredPerkId = ref<string | null>(null)
const hoveredInstanceId = ref<string | null>(null)

const instances = MOCK_INSTANCES

// --- Data Hydration ---

// We need to attach instance IDs to perks for the visualization
interface HydratedPerk extends MockPerk {
  instanceIds: string[]
}

const allPerksMap = new Map<string, HydratedPerk>()

// Initialize Map
ALL_PERKS.forEach(p => {
  allPerksMap.set(p.id, { ...p, instanceIds: [] })
})

// Populate ownership
instances.forEach(inst => {
  inst.perks.forEach(pId => {
    const perk = allPerksMap.get(pId)
    if (perk) {
      perk.instanceIds.push(inst.id)
    }
  })
})

const matrixColumns = Array.from({ length: 6 }, (_, i) => ({
  perks: Array.from(allPerksMap.values()).filter(p => p.colIndex === i)
}))


// --- Helpers ---

const getPerkNameById = (id: string) => allPerksMap.get(id)?.name || id

const getInstanceColor = (instId: string) => INSTANCE_COLORS[instId] || '#6B7280'

const instanceHasPerk = (inst: MockInstance, perkId: string) => inst.perks.includes(perkId)

// --- Dynamic Styling Classes ---

const isPerkHighlighted = (perk: HydratedPerk) => {
  if (hoveredPerkId.value === perk.id) return true
  if (hoveredInstanceId.value && perk.instanceIds.includes(hoveredInstanceId.value)) return true
  return false
}

const getPerkClasses = (perk: HydratedPerk) => {
  if (visualMode.value === 'simple') {
    if (hoveredPerkId.value === perk.id) return 'bg-blue-600/30'
    if (isPerkHighlighted(perk)) return 'bg-blue-600/10'
    return 'bg-gray-800'
  }
  
  // Segmented mode
  return 'bg-gray-800'
}

const getInstanceClasses = (instance: MockInstance) => {
  const base = 'bg-gray-800 border-gray-700'
  
  if (visualMode.value === 'simple') {
    if (hoveredInstanceId.value === instance.id) return 'bg-blue-900 border-blue-500 ring-1 ring-blue-500'
    
    // If hovering a perk that this instance has
    if (hoveredPerkId.value && instanceHasPerk(instance, hoveredPerkId.value)) {
      return 'bg-blue-900/50 border-blue-500/50'
    }
    
    // Dim others if something is hovered
    if (hoveredPerkId.value || hoveredInstanceId.value) {
      return 'opacity-50'
    }
    
    return base
  }
  
  // Segmented mode styles
  if (hoveredInstanceId.value === instance.id) {
    return 'ring-2 ring-white border-transparent'
  }
  
  // If hovering a perk and this instance has it
  if (hoveredPerkId.value && instanceHasPerk(instance, hoveredPerkId.value)) {
    return 'brightness-110 ring-1 ring-white/50'
  }
  
    // Dim others if something is hovered
  if (hoveredPerkId.value || hoveredInstanceId.value) {
      return 'opacity-40 grayscale-[0.5]'
  }

  return base
}

const getInstanceStyle = (instance: MockInstance) => {
  if (visualMode.value === 'segmented') {
    const color = getInstanceColor(instance.id)
    return {
      borderLeftWidth: '4px',
      borderLeftColor: color
    }
  }
  return {}
}
</script>
