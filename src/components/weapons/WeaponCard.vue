<template>
  <div class="rounded-xl border border-gray-700 bg-gray-800 p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-start gap-4 min-w-0">
        <WeaponIcon
          :icon="weapon.weaponIcon"
          :watermark="weapon.iconWatermark"
          :alt="weapon.weaponName"
          size="lg"
        />
        <div class="min-w-0">
          <h3 class="text-xl font-semibold truncate">{{ weapon.weaponName }}</h3>
          <p class="text-xs text-gray-500">Hash: {{ weapon.weaponHash }}</p>
        </div>
      </div>

      <div class="text-right flex-shrink-0">
        <p class="text-lg font-semibold text-blue-300">{{ weapon.instances.length }}</p>
        <p class="text-[10px] text-gray-500 uppercase">{{ weapon.instances.length === 1 ? 'Copy' : 'Copies' }}</p>
      </div>
    </div>

    <div class="mt-5">
      <WeaponMatrix :columns="weapon.perkMatrix" />
    </div>

    <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div class="flex items-center justify-between rounded-lg bg-gray-900/40 px-3 py-2">
        <span class="text-gray-400">Perks Possible</span>
        <span class="font-semibold text-gray-200">{{ weapon.totalPerksPossible }}</span>
      </div>
      <div class="flex items-center justify-between rounded-lg bg-gray-900/40 px-3 py-2">
        <span class="text-gray-400">Perks Owned</span>
        <span class="font-semibold text-green-300">{{ weapon.totalPerksOwned }}</span>
      </div>
    </div>

    <div class="mt-4 rounded-lg border border-gray-700 bg-gray-900/40 p-3">
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

    <div class="mt-4">
      <InstanceList :instances="weapon.instances" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DedupedWeapon } from '@/models/deduped-weapon'
import WeaponMatrix from './WeaponMatrix.vue'
import InstanceList from './InstanceList.vue'
import WeaponIcon from '@/components/common/WeaponIcon.vue'

defineProps<{
  weapon: DedupedWeapon
}>()
</script>
