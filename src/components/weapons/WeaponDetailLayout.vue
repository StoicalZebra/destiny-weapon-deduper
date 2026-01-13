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
      <!-- Legacy Migration Banner -->
      <LegacyMigrationBanner />

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
        <WeaponsCoverage
          :weapon="weapon"
          @load-wishlist-item="handleLoadWishlistItem"
          @edit-wishlist-item="handleEditWishlistItem"
        />
      </div>

      <div v-else-if="activeTab === 'godroll'">
        <WeaponsGodRoll
          ref="godRollRef"
          :weapon="weapon"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import WeaponsCoverage from '@/components/weapons/WeaponsCoverage.vue'
import WeaponsGodRoll from '@/components/weapons/WeaponsGodRoll.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import WeaponIcon from '@/components/common/WeaponIcon.vue'
import LegacyMigrationBanner from '@/components/common/LegacyMigrationBanner.vue'
import { useWishlistsStore } from '@/stores/wishlists'
import type { DedupedWeapon } from '@/models/deduped-weapon'
import type { WishlistItem, Wishlist } from '@/models/wishlist'

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
  editItemId?: string
  editWishlistId?: string
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
const godRollRef = ref<InstanceType<typeof WeaponsGodRoll> | null>(null)

const tabs = [
  { id: 'coverage', label: 'Perk Coverage' },
  { id: 'godroll', label: 'Set your God Rolls' }
] as const

// Handle loading a wishlist item into the God Roll Creator
async function handleLoadWishlistItem(item: WishlistItem, _wishlist: Wishlist) {
  activeTab.value = 'godroll'
  await nextTick()
  godRollRef.value?.loadWishlistItem(item)
}

// Handle editing a wishlist item in the God Roll Creator
async function handleEditWishlistItem(item: WishlistItem, wishlist: Wishlist) {
  activeTab.value = 'godroll'
  await nextTick()
  godRollRef.value?.editWishlistItem(item, wishlist)
}

// Load edit item from URL params
const wishlistsStore = useWishlistsStore()

async function loadEditItem() {
  if (!props.editItemId || !props.editWishlistId) return

  // Ensure wishlists store is initialized
  if (!wishlistsStore.initialized) {
    await wishlistsStore.initialize(false)
  }

  // Find the wishlist and item
  const wishlist = wishlistsStore.getWishlistById(props.editWishlistId)
  if (!wishlist) return

  const item = wishlist.items.find(i => i.id === props.editItemId)
  if (!item) return

  // Trigger edit mode
  await handleEditWishlistItem(item, wishlist)
}

// Trigger edit when component mounts with edit params
onMounted(() => {
  if (props.editItemId && props.editWishlistId) {
    loadEditItem()
  }
})

// Also watch for weapon to load (in case it wasn't ready at mount)
watch(() => props.weapon, (newWeapon) => {
  if (newWeapon && props.editItemId && props.editWishlistId) {
    loadEditItem()
  }
}, { immediate: false })
</script>
