import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useAuthStore } from './auth'
import { inventoryAPI, type DestinyProfileResponse } from '@/api/inventory'
import { weaponParser } from '@/services/weapon-parser'
import { buildDedupedWeapon } from '@/services/deduplication'
import type { DedupedWeapon } from '@/models/deduped-weapon'
import type { WeaponInstance } from '@/models/weapon-instance'

export const useWeaponsStore = defineStore('weapons', () => {
  // State - use shallowRef for large arrays that are replaced wholesale (not mutated)
  // This avoids Vue creating deep reactive proxies for hundreds of nested weapon objects
  const weapons = shallowRef<DedupedWeapon[]>([])
  const weaponInstances = shallowRef<WeaponInstance[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Raw API response for export (used to sync mock data for local dev)
  const rawProfileResponse = shallowRef<DestinyProfileResponse | null>(null)

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

      // Fetch profile from Bungie API
      const profile = await inventoryAPI.getProfile(
        membershipType,
        membershipId,
        authStore.accessToken
      )

      // Store raw response for export (local dev mock data sync)
      rawProfileResponse.value = profile

      // Parse weapons from profile
      const parsedWeapons = weaponParser.parseWeapons(profile)
      weaponInstances.value = parsedWeapons

      // Group weapons by name + season (combines holofoil variants with normal versions)
      const grouped = weaponParser.groupWeaponsByNameAndSeason(parsedWeapons)

      // Build deduped weapon entries with perk matrices
      const dedupedWeapons: DedupedWeapon[] = []

      for (const [, instances] of grouped) {
        dedupedWeapons.push(buildDedupedWeapon(instances))
      }

      // Sort by weapon name
      dedupedWeapons.sort((a, b) => a.weaponName.localeCompare(b.weaponName))

      weapons.value = dedupedWeapons
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load weapons'
    } finally {
      loading.value = false
    }
  }

  function clearWeapons() {
    weapons.value = []
    weaponInstances.value = []
    rawProfileResponse.value = null
    error.value = null
  }

  /**
   * Export raw API response as JSON for local dev mock data
   * Returns JSON string in the format expected by mock-inventory.json
   */
  function exportRawInventory(): string | null {
    if (!rawProfileResponse.value) return null
    return JSON.stringify({ Response: rawProfileResponse.value }, null, 2)
  }

  return {
    weapons,
    weaponInstances,
    rawProfileResponse,
    loading,
    error,
    loadWeapons,
    clearWeapons,
    exportRawInventory
  }
})
