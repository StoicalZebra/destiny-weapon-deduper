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
})
