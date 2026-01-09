import { manifestService } from './manifest-service'

// Video source metadata for imported god rolls
export interface VideoSource {
  author: string
  videoTitle: string
  timestamp?: string
  timestampUrl?: string
  videoUrl: string
}

// Match the SavedProfile interface from WeaponsGodRoll.vue
export interface SavedProfile {
  id: string
  name: string
  notes?: string
  selection: Record<number, 'OR' | 'AND'>
  isFromCommunityPick?: boolean
  source?: VideoSource  // YouTube video source info
}

export interface GodRollExport {
  version: '1.0'
  exportedAt: string
  godRolls: Array<{
    weaponHash: number
    weaponName: string
    profiles: SavedProfile[]
  }>
}

const STORAGE_KEY_PREFIX = 'd3_godroll_'

class GodRollStorageService {
  /**
   * Get all god roll keys from localStorage
   */
  private getAllKeys(): string[] {
    return Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX))
  }

  /**
   * Extract weapon hash from storage key
   */
  private extractWeaponHash(key: string): number {
    return Number(key.replace(STORAGE_KEY_PREFIX, ''))
  }

  /**
   * Get storage key for a weapon hash
   */
  private getStorageKey(weaponHash: number): string {
    return `${STORAGE_KEY_PREFIX}${weaponHash}`
  }

  /**
   * Get all god rolls across all weapons
   */
  getAllGodRolls(): Map<number, SavedProfile[]> {
    const result = new Map<number, SavedProfile[]>()

    for (const key of this.getAllKeys()) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const profiles = JSON.parse(raw) as SavedProfile[]
          const weaponHash = this.extractWeaponHash(key)
          result.set(weaponHash, profiles)
        }
      } catch (e) {
        console.warn(`Failed to parse god rolls for key ${key}`, e)
      }
    }

    return result
  }

  /**
   * Get stats about stored god rolls
   */
  getStats(): { rollCount: number; weaponCount: number } {
    const allRolls = this.getAllGodRolls()
    let rollCount = 0

    for (const profiles of allRolls.values()) {
      rollCount += profiles.length
    }

    return {
      rollCount,
      weaponCount: allRolls.size
    }
  }

  /**
   * Export all god rolls to a JSON object
   */
  exportAll(): GodRollExport {
    const allRolls = this.getAllGodRolls()
    const godRolls: GodRollExport['godRolls'] = []

    for (const [weaponHash, profiles] of allRolls) {
      // Get weapon name from manifest
      const weaponDef = manifestService.getInventoryItem(weaponHash)
      const weaponName = weaponDef?.displayProperties?.name || `Unknown (${weaponHash})`

      // Clean up UI-only properties before export
      const cleanProfiles = profiles.map(p => ({
        id: p.id,
        name: p.name,
        notes: p.notes,
        selection: p.selection,
        isFromCommunityPick: p.isFromCommunityPick
      }))

      godRolls.push({
        weaponHash,
        weaponName,
        profiles: cleanProfiles
      })
    }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      godRolls
    }
  }

  /**
   * Validate import data structure
   */
  validateImport(data: unknown): data is GodRollExport {
    if (!data || typeof data !== 'object') return false

    const obj = data as Record<string, unknown>

    if (obj.version !== '1.0') return false
    if (!Array.isArray(obj.godRolls)) return false

    for (const entry of obj.godRolls) {
      if (typeof entry !== 'object' || !entry) return false

      const e = entry as Record<string, unknown>
      if (typeof e.weaponHash !== 'number') return false
      if (!Array.isArray(e.profiles)) return false

      for (const profile of e.profiles) {
        if (typeof profile !== 'object' || !profile) return false

        const p = profile as Record<string, unknown>
        if (typeof p.id !== 'string') return false
        if (typeof p.name !== 'string') return false
        if (typeof p.selection !== 'object' || !p.selection) return false
      }
    }

    return true
  }

  /**
   * Import god rolls from exported data
   */
  importAll(
    data: GodRollExport,
    mode: 'merge' | 'replace'
  ): { imported: number; skipped: number; weaponsAffected: number } {
    let imported = 0
    let skipped = 0
    const weaponsAffected = new Set<number>()

    if (mode === 'replace') {
      // Clear all existing god rolls
      this.clearAll()
    }

    for (const entry of data.godRolls) {
      const { weaponHash, profiles } = entry
      const key = this.getStorageKey(weaponHash)

      if (mode === 'replace') {
        // Just save all profiles
        localStorage.setItem(key, JSON.stringify(profiles))
        imported += profiles.length
        weaponsAffected.add(weaponHash)
      } else {
        // Merge mode: skip duplicates by name
        const existing = this.getProfilesForWeapon(weaponHash)
        const existingNames = new Set(existing.map(p => p.name.toLowerCase()))

        for (const profile of profiles) {
          if (existingNames.has(profile.name.toLowerCase())) {
            skipped++
          } else {
            // Generate new ID to avoid conflicts
            existing.push({
              ...profile,
              id: crypto.randomUUID()
            })
            imported++
            weaponsAffected.add(weaponHash)
          }
        }

        if (weaponsAffected.has(weaponHash)) {
          localStorage.setItem(key, JSON.stringify(existing))
        }
      }
    }

    return { imported, skipped, weaponsAffected: weaponsAffected.size }
  }

  /**
   * Get profiles for a specific weapon
   */
  private getProfilesForWeapon(weaponHash: number): SavedProfile[] {
    const key = this.getStorageKey(weaponHash)
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  /**
   * Clear all god rolls from localStorage
   */
  clearAll(): number {
    const keys = this.getAllKeys()
    for (const key of keys) {
      localStorage.removeItem(key)
    }
    return keys.length
  }

  /**
   * Trigger file download for export
   */
  downloadExport(): void {
    const data = this.exportAll()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const date = new Date().toISOString().split('T')[0]
    const filename = `d3-godrolls-${date}.json`

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export const godRollStorageService = new GodRollStorageService()
