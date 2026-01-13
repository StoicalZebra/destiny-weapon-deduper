<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <img
          v-if="weaponIcon"
          :src="`https://www.bungie.net${weaponIcon}`"
          :alt="weaponName"
          class="w-16 h-16 rounded"
        />
        <div v-else class="w-16 h-16 rounded bg-surface-overlay flex items-center justify-center">
          <span class="text-text-subtle text-xl">?</span>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-text">{{ weaponName }}</h1>
          <p class="text-xs text-text-subtle">Hash: {{ weaponHash }}</p>
          <span class="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
            Not in your inventory
          </span>
        </div>
      </div>
      <button
        @click="$emit('back')"
        class="text-sm text-accent-primary hover:text-accent-primary/80"
      >
        &larr; Back to Weapons
      </button>
    </div>

    <!-- Info Banner -->
    <div class="mb-6 p-4 bg-surface-elevated/50 rounded-lg border border-border">
      <p class="text-sm text-text-muted">
        You have saved wishlist rolls for this weapon, but it's not currently in your inventory.
        The perk selection grid is only available for weapons you own.
      </p>
    </div>

    <!-- Saved Wishlist Rolls -->
    <div class="space-y-4">
      <h2 class="text-lg font-bold text-text">Saved Wishlist Rolls</h2>

      <div v-if="profiles.length === 0" class="text-center py-8 text-text-subtle">
        No saved wishlist rolls found.
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="profile in profiles"
          :key="profile.id"
          class="bg-surface-elevated border border-border rounded-lg p-4"
        >
          <h3 class="font-bold text-text mb-2">{{ profile.name }}</h3>

          <!-- Source Info -->
          <div v-if="profile.source" class="text-xs text-text-subtle mb-2">
            <span class="text-purple-600 dark:text-purple-400">{{ profile.source.author }}</span>
            <span v-if="profile.source.videoTitle"> · {{ profile.source.videoTitle }}</span>
            <a
              v-if="profile.source.timestampUrl"
              :href="profile.source.timestampUrl"
              target="_blank"
              class="ml-2 text-accent-primary hover:text-accent-primary/80"
              @click.stop
            >
              Watch ↗
            </a>
          </div>

          <!-- Notes -->
          <p v-if="profile.notes" class="text-xs text-text-muted mb-3 line-clamp-3">
            {{ profile.notes }}
          </p>

          <!-- Perk Tags -->
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(type, hash) in profile.selection"
              :key="hash"
              class="text-xs px-1.5 py-0.5 rounded"
              :class="type === 'OR'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-500/30'
                : 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-200 border border-orange-300 dark:border-orange-500/30'"
              :title="type === 'OR' ? 'Nice to have' : 'Required'"
            >
              {{ getPerkName(Number(hash)) }}
            </span>
          </div>

          <p class="text-xs text-text-subtle mt-2">
            {{ Object.keys(profile.selection).length }} perks selected
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { manifestService } from '@/services/manifest-service'

interface VideoSource {
  author: string
  videoTitle: string
  timestamp?: string
  timestampUrl?: string
  videoUrl: string
}

interface SavedProfile {
  id: string
  name: string
  notes?: string
  selection: Record<number, 'OR' | 'AND'>
  source?: VideoSource
}

const props = defineProps<{
  weaponHash: number
  weaponDef: {
    displayProperties?: {
      name?: string
      icon?: string
    }
  } | null
}>()

defineEmits<{
  back: []
}>()

const profiles = ref<SavedProfile[]>([])

const weaponName = computed(() =>
  props.weaponDef?.displayProperties?.name || `Unknown Weapon (${props.weaponHash})`
)

const weaponIcon = computed(() =>
  props.weaponDef?.displayProperties?.icon || null
)

const STORAGE_KEY = computed(() => `d3_godroll_${props.weaponHash}`)

const loadProfiles = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY.value)
    if (raw) {
      profiles.value = JSON.parse(raw)
    }
  } catch (e) {
    console.error('Failed to load god roll profiles', e)
    profiles.value = []
  }
}

const perkNameCache = new Map<number, string>()

const getPerkName = (hash: number): string => {
  if (perkNameCache.has(hash)) {
    return perkNameCache.get(hash)!
  }

  const perkDef = manifestService.getInventoryItem(hash)
  const name = perkDef?.displayProperties?.name || `Perk ${hash}`
  perkNameCache.set(hash, name)
  return name
}

onMounted(loadProfiles)
watch(() => props.weaponHash, loadProfiles)
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
