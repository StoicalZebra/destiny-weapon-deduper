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
            <p v-if="weapon.seasonName" class="text-xs text-text-subtle">{{ weapon.seasonName }}</p>
            <p class="text-xs text-text-subtle">Hash: {{ weapon.weaponHash }}</p>
            <p class="text-xs text-text-subtle">
              {{ weapon.instances.length }} {{ weapon.instances.length === 1 ? 'Copy' : 'Copies' }}<span v-if="subtitle"> {{ subtitle }}</span>
            </p>
          </div>
          <!-- Stats -->
          <div class="hidden sm:flex items-center gap-6 ml-6 pl-6 border-l border-border">
            <div class="text-center">
              <p class="text-lg font-semibold text-text-muted">{{ weapon.totalPerksPossible }}</p>
              <p class="text-xs text-text-subtle uppercase tracking-wide">Perks Possible</p>
            </div>
            <div class="text-center">
              <p class="text-lg font-semibold text-green-600 dark:text-green-300">{{ weapon.totalPerksOwned }}</p>
              <p class="text-xs text-text-subtle uppercase tracking-wide">Perks Owned</p>
            </div>
          </div>
        </template>
        <h1 v-else class="text-3xl font-bold">{{ fallbackTitle }}</h1>
      </div>
      <button
        v-if="weapon"
        @click="$emit('back')"
        class="text-sm text-accent-primary hover:text-accent-primary/80"
      >
        &larr; {{ backLabel }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <LoadingSpinner />
      <p class="mt-4 text-text-muted">{{ loadingMessage }}</p>
      <slot name="loading-extra"></slot>
    </div>

    <!-- Error State -->
    <ErrorMessage v-else-if="error" :message="error" />

    <!-- Not Found State -->
    <div v-else-if="!weapon" class="text-center py-12 text-text-subtle">
      <p>{{ notFoundMessage }}</p>
    </div>

    <!-- Weapon Content -->
    <div v-else>
      <!-- Legacy Migration Banner -->
      <LegacyMigrationBanner />

      <!-- Unified Weapon Detail View -->
      <WeaponDetailUnified
        ref="unifiedRef"
        :weapon="weapon"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import WeaponDetailUnified from '@/components/weapons/WeaponDetailUnified.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import WeaponIcon from '@/components/common/WeaponIcon.vue'
import LegacyMigrationBanner from '@/components/common/LegacyMigrationBanner.vue'
import { useWishlistsStore } from '@/stores/wishlists'
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
  notFoundMessage: 'Weapon not found. Try returning to the list.'
})

defineEmits<{
  back: []
}>()

const unifiedRef = ref<InstanceType<typeof WeaponDetailUnified> | null>(null)

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

  // Trigger edit mode in unified component
  await nextTick()
  unifiedRef.value?.editWishlistItem(item, wishlist)
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
