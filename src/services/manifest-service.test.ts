import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the storage before importing the service
vi.mock('@/utils/storage', () => ({
  indexedDBStorage: {
    getManifestTable: vi.fn()
  }
}))

import { manifestService } from './manifest-service'
import { indexedDBStorage } from '@/utils/storage'

describe('ManifestService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    manifestService.clearCache()
  })

  describe('loadTable', () => {
    it('loads table data into cache', async () => {
      const mockData = {
        '12345': { hash: 12345, name: 'Test Item' }
      }
      vi.mocked(indexedDBStorage.getManifestTable).mockResolvedValue(mockData)

      await manifestService.loadTable('DestinyInventoryItemDefinition')

      expect(manifestService.isTableLoaded('DestinyInventoryItemDefinition')).toBe(true)
    })

    it('does not reload already loaded table', async () => {
      const mockData = { '12345': { hash: 12345 } }
      vi.mocked(indexedDBStorage.getManifestTable).mockResolvedValue(mockData)

      await manifestService.loadTable('DestinyInventoryItemDefinition')
      await manifestService.loadTable('DestinyInventoryItemDefinition')

      expect(indexedDBStorage.getManifestTable).toHaveBeenCalledTimes(1)
    })

    it('throws error when table not found', async () => {
      vi.mocked(indexedDBStorage.getManifestTable).mockResolvedValue(null)

      await expect(
        manifestService.loadTable('DestinyInventoryItemDefinition')
      ).rejects.toThrow('Manifest table DestinyInventoryItemDefinition not found in storage')
    })
  })

  describe('getDefinition', () => {
    it('returns null for unloaded table', () => {
      const result = manifestService.getDefinition('DestinyPlugSetDefinition', 12345)
      expect(result).toBeNull()
    })

    it('returns definition by positive hash', async () => {
      const mockData = {
        '12345': { hash: 12345, name: 'Test Item' }
      }
      vi.mocked(indexedDBStorage.getManifestTable).mockResolvedValue(mockData)
      await manifestService.loadTable('DestinyInventoryItemDefinition')

      const result = manifestService.getDefinition('DestinyInventoryItemDefinition', 12345)
      expect(result).toEqual({ hash: 12345, name: 'Test Item' })
    })

    it('handles signed/unsigned hash conversion for negative hashes', async () => {
      // Bungie uses signed 32-bit integers, so large unsigned values appear negative
      // 4294967295 (0xFFFFFFFF) as signed = -1
      const unsignedHash = 4294967295
      const signedHash = -1

      const mockData = {
        [String(unsignedHash)]: { hash: unsignedHash, name: 'Unsigned Key Item' }
      }
      vi.mocked(indexedDBStorage.getManifestTable).mockResolvedValue(mockData)
      await manifestService.loadTable('DestinyInventoryItemDefinition')

      // Looking up with negative should find the unsigned key
      const result = manifestService.getDefinition('DestinyInventoryItemDefinition', signedHash)
      expect(result).toEqual({ hash: unsignedHash, name: 'Unsigned Key Item' })
    })

    it('handles signed/unsigned hash conversion for large positive hashes', async () => {
      // Large positive number that becomes negative when converted to signed
      const largeHash = 3000000000
      const signedEquivalent = largeHash | 0 // -1294967296

      const mockData = {
        [String(signedEquivalent)]: { hash: largeHash, name: 'Signed Key Item' }
      }
      vi.mocked(indexedDBStorage.getManifestTable).mockResolvedValue(mockData)
      await manifestService.loadTable('DestinyInventoryItemDefinition')

      // Looking up with large positive should find the signed key
      const result = manifestService.getDefinition('DestinyInventoryItemDefinition', largeHash)
      expect(result).toEqual({ hash: largeHash, name: 'Signed Key Item' })
    })

    it('returns null for non-existent hash', async () => {
      const mockData = {
        '12345': { hash: 12345, name: 'Test Item' }
      }
      vi.mocked(indexedDBStorage.getManifestTable).mockResolvedValue(mockData)
      await manifestService.loadTable('DestinyInventoryItemDefinition')

      const result = manifestService.getDefinition('DestinyInventoryItemDefinition', 99999)
      expect(result).toBeNull()
    })
  })

  describe('getInventoryItem', () => {
    it('returns inventory item definition', async () => {
      const mockItem = {
        hash: 12345,
        displayProperties: { name: 'Austringer', description: '', icon: '', hasIcon: true },
        itemType: 3
      }
      const mockData = { '12345': mockItem }
      vi.mocked(indexedDBStorage.getManifestTable).mockResolvedValue(mockData)
      await manifestService.loadTable('DestinyInventoryItemDefinition')

      const result = manifestService.getInventoryItem(12345)
      expect(result).toEqual(mockItem)
    })

    it('returns null for missing item', async () => {
      const mockData = {}
      vi.mocked(indexedDBStorage.getManifestTable).mockResolvedValue(mockData)
      await manifestService.loadTable('DestinyInventoryItemDefinition')

      const result = manifestService.getInventoryItem(99999)
      expect(result).toBeNull()
    })
  })

  describe('getPlugSet', () => {
    it('returns plug set definition', async () => {
      const mockPlugSet = {
        hash: 54321,
        displayProperties: { name: 'Test Plug Set', description: '' },
        reusablePlugItems: [
          { plugItemHash: 111 },
          { plugItemHash: 222 }
        ]
      }
      const mockData = { '54321': mockPlugSet }
      vi.mocked(indexedDBStorage.getManifestTable).mockResolvedValue(mockData)
      await manifestService.loadTable('DestinyPlugSetDefinition')

      const result = manifestService.getPlugSet(54321)
      expect(result).toEqual(mockPlugSet)
    })
  })

  describe('clearCache', () => {
    it('clears all cached tables', async () => {
      const mockData = { '12345': { hash: 12345 } }
      vi.mocked(indexedDBStorage.getManifestTable).mockResolvedValue(mockData)

      await manifestService.loadTable('DestinyInventoryItemDefinition')
      expect(manifestService.isTableLoaded('DestinyInventoryItemDefinition')).toBe(true)

      manifestService.clearCache()
      expect(manifestService.isTableLoaded('DestinyInventoryItemDefinition')).toBe(false)
    })
  })

  describe('isTableLoaded', () => {
    it('returns false for unloaded table', () => {
      expect(manifestService.isTableLoaded('DestinyStatDefinition')).toBe(false)
    })

    it('returns true for loaded table', async () => {
      const mockData = { '12345': { hash: 12345 } }
      vi.mocked(indexedDBStorage.getManifestTable).mockResolvedValue(mockData)
      await manifestService.loadTable('DestinyStatDefinition')

      expect(manifestService.isTableLoaded('DestinyStatDefinition')).toBe(true)
    })
  })

  describe('buildTraitMapping', () => {
    it('builds mapping between base and enhanced traits by name', async () => {
      // Setup: Create mock inventory items with base and enhanced traits
      const baseTraitHash = 1000
      const enhancedTraitHash = 1001
      const baseOnlyHash = 2000

      const mockInventoryItems = {
        [baseTraitHash]: {
          hash: baseTraitHash,
          displayProperties: { name: 'Rampage', description: '', icon: '', hasIcon: true },
          inventory: { tierType: 2 } // Basic = base trait
        },
        [enhancedTraitHash]: {
          hash: enhancedTraitHash,
          displayProperties: { name: 'Rampage', description: '', icon: '', hasIcon: true },
          inventory: { tierType: 3 } // Common = enhanced trait
        },
        [baseOnlyHash]: {
          hash: baseOnlyHash,
          displayProperties: { name: 'Outlaw', description: '', icon: '', hasIcon: true },
          inventory: { tierType: 2 }
        }
      }

      const mockPlugSets = {
        '100': {
          hash: 100,
          reusablePlugItems: [
            { plugItemHash: baseTraitHash },
            { plugItemHash: enhancedTraitHash },
            { plugItemHash: baseOnlyHash }
          ]
        }
      }

      // Load both tables
      vi.mocked(indexedDBStorage.getManifestTable)
        .mockResolvedValueOnce(mockInventoryItems)
        .mockResolvedValueOnce(mockPlugSets)

      await manifestService.loadTable('DestinyInventoryItemDefinition')
      await manifestService.loadTable('DestinyPlugSetDefinition')

      // Build the mapping
      manifestService.buildTraitMapping()

      // Verify mapping was built correctly
      expect(manifestService.getEnhancedVariant(baseTraitHash)).toBe(enhancedTraitHash)
      expect(manifestService.getBaseVariant(enhancedTraitHash)).toBe(baseTraitHash)

      // Base-only trait should have no enhanced variant
      expect(manifestService.getEnhancedVariant(baseOnlyHash)).toBeUndefined()
    })

    it('handles legacy "Name Enhanced" format', async () => {
      const baseHash = 3000
      const enhancedHash = 3001

      const mockInventoryItems = {
        [baseHash]: {
          hash: baseHash,
          displayProperties: { name: 'Kill Clip', description: '', icon: '', hasIcon: true },
          inventory: { tierType: 2 }
        },
        [enhancedHash]: {
          hash: enhancedHash,
          displayProperties: { name: 'Kill Clip Enhanced', description: '', icon: '', hasIcon: true },
          inventory: { tierType: 3 }
        }
      }

      const mockPlugSets = {
        '200': {
          hash: 200,
          reusablePlugItems: [
            { plugItemHash: baseHash },
            { plugItemHash: enhancedHash }
          ]
        }
      }

      vi.mocked(indexedDBStorage.getManifestTable)
        .mockResolvedValueOnce(mockInventoryItems)
        .mockResolvedValueOnce(mockPlugSets)

      await manifestService.loadTable('DestinyInventoryItemDefinition')
      await manifestService.loadTable('DestinyPlugSetDefinition')

      manifestService.buildTraitMapping()

      expect(manifestService.getEnhancedVariant(baseHash)).toBe(enhancedHash)
      expect(manifestService.getBaseVariant(enhancedHash)).toBe(baseHash)
    })

    it('does not rebuild if already built', async () => {
      const mockInventoryItems = {
        '1000': {
          hash: 1000,
          displayProperties: { name: 'Test', description: '', icon: '', hasIcon: true },
          inventory: { tierType: 2 }
        }
      }

      const mockPlugSets = {
        '100': {
          hash: 100,
          reusablePlugItems: [{ plugItemHash: 1000 }]
        }
      }

      vi.mocked(indexedDBStorage.getManifestTable)
        .mockResolvedValueOnce(mockInventoryItems)
        .mockResolvedValueOnce(mockPlugSets)

      await manifestService.loadTable('DestinyInventoryItemDefinition')
      await manifestService.loadTable('DestinyPlugSetDefinition')

      manifestService.buildTraitMapping()
      expect(manifestService.isTraitMappingBuilt()).toBe(true)

      // Call again - should not rebuild
      manifestService.buildTraitMapping()
      expect(manifestService.isTraitMappingBuilt()).toBe(true)
    })

    it('returns empty mapping when plug set table not loaded', () => {
      manifestService.buildTraitMapping()

      expect(manifestService.isTraitMappingBuilt()).toBe(true)
      expect(manifestService.getTraitMappingSize()).toBe(0)
    })

    it('clears mapping when cache is cleared', async () => {
      const mockInventoryItems = {
        '1000': {
          hash: 1000,
          displayProperties: { name: 'Test', description: '', icon: '', hasIcon: true },
          inventory: { tierType: 2 }
        },
        '1001': {
          hash: 1001,
          displayProperties: { name: 'Test', description: '', icon: '', hasIcon: true },
          inventory: { tierType: 3 }
        }
      }

      const mockPlugSets = {
        '100': {
          hash: 100,
          reusablePlugItems: [{ plugItemHash: 1000 }, { plugItemHash: 1001 }]
        }
      }

      vi.mocked(indexedDBStorage.getManifestTable)
        .mockResolvedValueOnce(mockInventoryItems)
        .mockResolvedValueOnce(mockPlugSets)

      await manifestService.loadTable('DestinyInventoryItemDefinition')
      await manifestService.loadTable('DestinyPlugSetDefinition')

      manifestService.buildTraitMapping()
      expect(manifestService.getEnhancedVariant(1000)).toBe(1001)

      manifestService.clearCache()
      expect(manifestService.isTraitMappingBuilt()).toBe(false)
      expect(manifestService.getEnhancedVariant(1000)).toBeUndefined()
    })
  })

  describe('getEnhancedVariant', () => {
    it('returns undefined when mapping not built', () => {
      expect(manifestService.getEnhancedVariant(12345)).toBeUndefined()
    })
  })

  describe('getBaseVariant', () => {
    it('returns undefined when mapping not built', () => {
      expect(manifestService.getBaseVariant(12345)).toBeUndefined()
    })
  })
})
