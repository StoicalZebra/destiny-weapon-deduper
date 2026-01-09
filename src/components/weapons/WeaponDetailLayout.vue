<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <template v-if="weapon">
          <WeaponIcon
            :icon="weapon.weaponIcon"
            :watermark="weapon.iconWatermark"
            :alt="weapon.weaponName"
            size="lg"
          />
          <div>
            <h1 class="text-2xl font-bold">{{ weapon.weaponName }}</h1>
            <p class="text-xs text-gray-500">Hash: {{ weapon.weaponHash }}</p>
            <p class="text-xs text-gray-500">
              {{ weapon.instances.length }} {{ weapon.instances.length === 1 ? 'Copy' : 'Copies' }}<span v-if="subtitle"> {{ subtitle }}</span>
            </p>
          </div>
          <!-- Stats -->
          <div class="hidden sm:flex items-center gap-6 ml-6 pl-6 border-l border-gray-700">
            <div class="text-center">
              <p class="text-lg font-semibold text-gray-300">{{ weapon.totalPerksPossible }}</p>
              <p class="text-[10px] text-gray-500 uppercase tracking-wide">Perks Possible</p>
            </div>
            <div class="text-center">
              <p class="text-lg font-semibold text-green-300">{{ weapon.totalPerksOwned }}</p>
              <p class="text-[10px] text-gray-500 uppercase tracking-wide">Perks Owned</p>
            </div>
          </div>
        </template>
        <h1 v-else class="text-3xl font-bold">{{ fallbackTitle }}</h1>
      </div>
      <button
        v-if="weapon"
        @click="$emit('back')"
        class="text-sm text-blue-400 hover:text-blue-300"
      >
        &larr; {{ backLabel }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <LoadingSpinner />
      <p class="mt-4 text-gray-400">{{ loadingMessage }}</p>
      <slot name="loading-extra"></slot>
    </div>

    <!-- Error State -->
    <ErrorMessage v-else-if="error" :message="error" />

    <!-- Not Found State -->
    <div v-else-if="!weapon" class="text-center py-12 text-gray-500">
      <p>{{ notFoundMessage }}</p>
    </div>

    <!-- Weapon Content -->
    <div v-else>
      <!-- Tabs -->
      <div class="mb-6 border-b border-gray-800">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
            :class="[
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div v-if="activeTab === 'coverage'">
        <WeaponsCoverage :weapon="weapon" />
      </div>

      <div v-else-if="activeTab === 'godroll'">
        <WeaponsGodRoll :weapon="weapon" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import WeaponsCoverage from '@/components/weapons/WeaponsCoverage.vue'
import WeaponsGodRoll from '@/components/weapons/WeaponsGodRoll.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import WeaponIcon from '@/components/common/WeaponIcon.vue'
import type { DedupedWeapon } from '@/models/deduped-weapon'

interface Props {
  weapon: DedupedWeapon | null
  loading?: boolean
  error?: string | null
  backLabel?: string
  subtitle?: string
  fallbackTitle?: string
  loadingMessage?: string
  notFoundMessage?: string
  initialTab?: 'coverage' | 'godroll'
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  backLabel: 'Back to all weapons',
  subtitle: '',
  fallbackTitle: 'Weapon Details',
  loadingMessage: 'Loading...',
  notFoundMessage: 'Weapon not found. Try returning to the list.',
  initialTab: 'coverage'
})

defineEmits<{
  back: []
}>()

const activeTab = ref<'coverage' | 'godroll'>(props.initialTab)

const tabs = [
  { id: 'coverage', label: 'Perk Coverage' },
  { id: 'godroll', label: 'Set your God Rolls' }
] as const
</script>
