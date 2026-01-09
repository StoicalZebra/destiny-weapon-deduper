<template>
  <div class="space-y-6 text-gray-200">
    <!-- Header -->
    <div class="flex items-center justify-between bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
      <div class="space-y-1">
        <h3 class="text-xl font-bold text-white">Overview Prototype</h3>
        <p class="text-sm text-gray-400">
          Visualizing your collection state. 
          <span class="text-green-400 font-bold ml-2">{{ ownedPerkCount }} unique perks owned</span> across {{ instances.length }} copies.
        </p>
      </div>
       <!-- Legend -->
      <div class="flex items-center gap-4 text-xs">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-green-900/50 border border-green-500/50"></div>
          <span class="text-gray-300">Owned</span>
        </div>
        <div class="flex items-center gap-2">
           <div class="w-3 h-3 rounded bg-gray-900/50 border border-gray-700 shadow-inner"></div>
          <span class="text-gray-500">Unowned</span>
        </div>
      </div>
    </div>

    <!-- Punchcard Matrix -->
    <div class="rounded-xl border border-gray-700 bg-gray-900/80 p-6 overflow-x-auto shadow-xl">
       <div class="flex gap-3 min-w-max">
          <!-- Columns -->
          <div 
            v-for="(col, colIdx) in matrixColumns" 
            :key="colIdx" 
            class="flex-1 min-w-[180px] space-y-3"
          >
             <!-- Column Header -->
             <div class="flex items-center justify-between border-b border-gray-800 pb-2 px-1">
                <h4 class="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {{ COLUMN_HEADERS[colIdx] }}
                </h4>
                <span class="text-[10px] text-gray-600 font-mono">
                  {{ col.filter(p => isOwned(p.id)).length }}/{{ col.length }}
                </span>
             </div>

             <!-- Perks Grid -->
             <div class="space-y-1.5">
                <div 
                  v-for="perk in col" 
                  :key="perk.id"
                  class="group relative flex items-center gap-3 rounded border px-2.5 py-2 text-xs transition-all duration-200 select-none"
                  :class="isOwned(perk.id) 
                    ? 'border-green-500/30 bg-gradient-to-r from-green-900/40 to-green-900/20 text-green-100 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.15)] hover:border-green-500/50' 
                    : 'border-gray-800 bg-gray-900/40 text-gray-600 grayscale opacity-70 hover:opacity-100 hover:bg-gray-800 hover:text-gray-400'"
                >
                  <!-- Icon Placeholder (would be img in real app) -->
                  <div 
                    class="h-6 w-6 rounded-sm shrink-0 flex items-center justify-center text-[8px] font-bold border transition-colors"
                    :class="isOwned(perk.id) ? 'bg-green-900/50 border-green-500/30 text-green-500' : 'bg-gray-800 border-gray-700 text-gray-700'"
                  >
                    {{ perk.name.charAt(0) }}
                  </div>
                  
                  <div class="flex flex-col min-w-0">
                    <span class="truncate font-semibold leading-none mb-0.5">{{ perk.name }}</span>
                    <span class="text-[9px] opacity-60 truncate">
                      {{ isOwned(perk.id) ? 'In Inventory' : 'Not Acquired' }}
                    </span>
                  </div>

                  <!-- Ownership Indicator Dot -->
                  <div 
                    v-if="isOwned(perk.id)" 
                    class="absolute right-2 w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]"
                  ></div>
                </div>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ALL_PERKS, MOCK_INSTANCES, COLUMN_HEADERS, type MockPerk } from './mock-data'

const instances = MOCK_INSTANCES

// Determine all owned perk IDs across all instances
const ownedPerkIds = computed(() => {
  const ids = new Set<string>()
  instances.forEach(inst => {
    inst.perks.forEach(pId => ids.add(pId))
  })
  return ids
})

const ownedPerkCount = computed(() => ownedPerkIds.value.size)

// Organize perks into columns matches headers
const matrixColumns = computed(() => {
  const cols: MockPerk[][] = Array.from({ length: 6 }, () => [])
  ALL_PERKS.forEach(p => {
    if (cols[p.colIndex]) {
      cols[p.colIndex].push(p)
    }
  })
  return cols
})

const isOwned = (perkId: string) => ownedPerkIds.value.has(perkId)

</script>
