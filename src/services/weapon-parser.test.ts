import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WeaponParser } from './weapon-parser'
import type { WeaponInstance } from '@/models/weapon-instance'

// Mock the manifest service
vi.mock('./manifest-service', () => ({
  manifestService: {
    getInventoryItem: vi.fn()
  }
}))

import { manifestService } from './manifest-service'

describe('WeaponParser', () => {
  let parser: WeaponParser

  beforeEach(() => {
    parser = new WeaponParser()
    vi.clearAllMocks()
  })

  describe('groupWeaponsByHash', () => {
    it('returns empty map for empty array', () => {
      const result = parser.groupWeaponsByHash([])
      expect(result.size).toBe(0)
    })

    it('groups single weapon correctly', () => {
      const weapons: WeaponInstance[] = [
        createWeaponInstance('1', 12345)
      ]
      const result = parser.groupWeaponsByHash(weapons)

      expect(result.size).toBe(1)
      expect(result.get(12345)?.length).toBe(1)
    })

    it('groups multiple instances of same weapon', () => {
      const weapons: WeaponInstance[] = [
        createWeaponInstance('1', 12345),
        createWeaponInstance('2', 12345),
        createWeaponInstance('3', 12345)
      ]
      const result = parser.groupWeaponsByHash(weapons)

      expect(result.size).toBe(1)
      expect(result.get(12345)?.length).toBe(3)
    })

    it('groups different weapons separately', () => {
      const weapons: WeaponInstance[] = [
        createWeaponInstance('1', 11111),
        createWeaponInstance('2', 22222),
        createWeaponInstance('3', 33333)
      ]
      const result = parser.groupWeaponsByHash(weapons)

      expect(result.size).toBe(3)
      expect(result.get(11111)?.length).toBe(1)
      expect(result.get(22222)?.length).toBe(1)
      expect(result.get(33333)?.length).toBe(1)
    })

    it('groups mixed weapons correctly', () => {
      const weapons: WeaponInstance[] = [
        createWeaponInstance('1', 11111),
        createWeaponInstance('2', 22222),
        createWeaponInstance('3', 11111),
        createWeaponInstance('4', 22222),
        createWeaponInstance('5', 11111)
      ]
      const result = parser.groupWeaponsByHash(weapons)

      expect(result.size).toBe(2)
      expect(result.get(11111)?.length).toBe(3)
      expect(result.get(22222)?.length).toBe(2)
    })

    it('preserves weapon instances in groups', () => {
      const weapon1 = createWeaponInstance('instance-1', 12345)
      const weapon2 = createWeaponInstance('instance-2', 12345)

      const result = parser.groupWeaponsByHash([weapon1, weapon2])
      const group = result.get(12345)

      expect(group).toContain(weapon1)
      expect(group).toContain(weapon2)
    })
  })

  describe('getWeaponName', () => {
    it('returns weapon name from manifest', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue({
        hash: 12345,
        index: 0,
        redacted: false,
        displayProperties: {
          name: 'Austringer',
          description: 'A hand cannon',
          icon: '/icon.png',
          hasIcon: true
        },
        itemTypeDisplayName: 'Hand Cannon',
        itemType: 3,
        itemSubType: 0
      })

      const result = parser.getWeaponName(12345)
      expect(result).toBe('Austringer')
    })

    it('returns fallback for missing definition', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(null)

      const result = parser.getWeaponName(99999)
      expect(result).toBe('Unknown Weapon (99999)')
    })
  })

  describe('getWeaponIcon', () => {
    it('returns weapon icon from manifest', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue({
        hash: 12345,
        index: 0,
        redacted: false,
        displayProperties: {
          name: 'Test Weapon',
          description: '',
          icon: '/common/destiny2_content/icons/weapon.png',
          hasIcon: true
        },
        itemTypeDisplayName: 'Auto Rifle',
        itemType: 3,
        itemSubType: 0
      })

      const result = parser.getWeaponIcon(12345)
      expect(result).toBe('/common/destiny2_content/icons/weapon.png')
    })

    it('returns empty string for missing definition', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(null)

      const result = parser.getWeaponIcon(99999)
      expect(result).toBe('')
    })
  })

  describe('getWeaponType', () => {
    it('returns weapon type from manifest', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue({
        hash: 12345,
        index: 0,
        redacted: false,
        displayProperties: {
          name: 'Test',
          description: '',
          icon: '',
          hasIcon: false
        },
        itemTypeDisplayName: 'Pulse Rifle',
        itemType: 3,
        itemSubType: 0
      })

      const result = parser.getWeaponType(12345)
      expect(result).toBe('Pulse Rifle')
    })

    it('returns "Weapon" for missing definition', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(null)

      const result = parser.getWeaponType(99999)
      expect(result).toBe('Weapon')
    })
  })

  describe('getWeaponTierType', () => {
    it('returns legendary tier type (5)', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue({
        hash: 12345,
        index: 0,
        redacted: false,
        displayProperties: { name: '', description: '', icon: '', hasIcon: false },
        itemTypeDisplayName: '',
        itemType: 3,
        itemSubType: 0,
        inventory: {
          tierType: 5,
          tierTypeName: 'Legendary',
          bucketTypeHash: 0
        }
      })

      const result = parser.getWeaponTierType(12345)
      expect(result).toBe(5)
    })

    it('returns exotic tier type (6)', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue({
        hash: 12345,
        index: 0,
        redacted: false,
        displayProperties: { name: '', description: '', icon: '', hasIcon: false },
        itemTypeDisplayName: '',
        itemType: 3,
        itemSubType: 0,
        inventory: {
          tierType: 6,
          tierTypeName: 'Exotic',
          bucketTypeHash: 0
        }
      })

      const result = parser.getWeaponTierType(12345)
      expect(result).toBe(6)
    })

    it('returns 0 for missing definition', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(null)

      const result = parser.getWeaponTierType(99999)
      expect(result).toBe(0)
    })
  })
})

// Helper function to create weapon instances for testing
function createWeaponInstance(instanceId: string, itemHash: number): WeaponInstance {
  return {
    itemInstanceId: instanceId,
    itemHash,
    sockets: {
      sockets: [
        { plugHash: 1, isEnabled: true },
        { plugHash: 2, isEnabled: true }
      ]
    }
  }
}
