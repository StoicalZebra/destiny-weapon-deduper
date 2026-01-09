import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'
import { inventoryAPI } from '@/api/inventory'
import { weaponParser } from '@/services/weapon-parser'
import { buildDedupedWeapon } from '@/services/deduplication'
import type { DedupedWeapon } from '@/models/deduped-weapon'
import type { WeaponInstance } from '@/models/weapon-instance'

export const useWeaponsStore = defineStore('weapons', () => {
  // State
  const weapons = ref<DedupedWeapon[]>([])
  const weaponInstances = ref<WeaponInstance[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  async function loadWeapons() {
    loading.value = true
    error.value = null

    try {
      const authStore = useAuthStore()

      // Check authentication
      if (!authStore.isAuthenticated || !authStore.accessToken) {
        throw new Error('Not authenticated')
      }

      // Check for selected Destiny membership
      if (!authStore.selectedMembership) {
        throw new Error('No Destiny membership selected')
      }

      const { membershipType, membershipId } = authStore.selectedMembership

      console.log(`Fetching inventory for ${membershipType}/${membershipId}`)

      // Fetch profile from Bungie API
      const profile = await inventoryAPI.getProfile(
        membershipType,
        membershipId,
        authStore.accessToken
      )

      console.log('Profile fetched successfully')

      // Parse weapons from profile
      const parsedWeapons = weaponParser.parseWeapons(profile)
      weaponInstances.value = parsedWeapons

      console.log(`Found ${parsedWeapons.length} weapons`)

      // Group weapons by hash for deduplication
      const grouped = weaponParser.groupWeaponsByHash(parsedWeapons)

      // Build deduped weapon entries with perk matrices
      const dedupedWeapons: DedupedWeapon[] = []

      for (const [weaponHash, instances] of grouped) {
        dedupedWeapons.push(buildDedupedWeapon(weaponHash, instances))
      }

      // Sort by weapon name
      dedupedWeapons.sort((a, b) => a.weaponName.localeCompare(b.weaponName))

      weapons.value = dedupedWeapons

      console.log(`Created ${dedupedWeapons.length} deduped weapon entries`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load weapons'
      console.error('Failed to load weapons:', err)
    } finally {
      loading.value = false
    }
  }

  function clearWeapons() {
    weapons.value = []
    weaponInstances.value = []
    error.value = null
  }

  return {
    weapons,
    weaponInstances,
    loading,
    error,
    loadWeapons,
    clearWeapons
  }
})
