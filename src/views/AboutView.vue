<template>
  <div class="text-center max-w-4xl mx-auto">
    <h1 class="text-5xl font-bold mb-6">Destiny DeDuper (D3)</h1>
    <p class="text-xl text-gray-400 mb-4">Destiny 2 Weapon Deduplication Manager</p>

    <div class="my-12 p-8 bg-gray-800 rounded-lg flex gap-8 items-center">
      <div class="flex-1">
        <h2 class="text-2xl font-semibold mb-4 text-left">What is Destiny DeDuper (D3)?</h2>
        <ul class="text-left space-y-3 text-gray-300">
          <li class="flex items-start">
            <span class="text-green-400 mr-2">✓</span>
            <span>Consolidate duplicate weapons into a single "punch-card" matrix view</span>
          </li>
          <li class="flex items-start">
            <span class="text-green-400 mr-2">✓</span>
            <span>Track your god roll progress for each weapon</span>
          </li>
          <li class="flex items-start">
            <span class="text-green-400 mr-2">✓</span>
            <span>Know exactly which duplicate weapons you can safely dismantle</span>
          </li>
          <li class="flex items-start">
            <span class="text-green-400 mr-2">✓</span>
            <span>See all perk combinations you've earned across all instances</span>
          </li>
        </ul>
      </div>
      <div class="flex-1">
        <img src="/images/icon.webp" alt="Destiny DeDuper" class="max-w-full rounded-lg" />
      </div>
    </div>

    <div class="mt-8">
      <LoginButton />
    </div>

    <div class="mt-12">
      <img src="/images/graphic.webp" alt="Destiny DeDuper" class="max-w-full mx-auto rounded-lg" />
    </div>
  </div>
</template>

<script setup lang="ts">
import LoginButton from '@/components/auth/LoginButton.vue'
</script>
