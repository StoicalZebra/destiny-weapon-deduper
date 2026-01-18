import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WeaponParser } from './weapon-parser'
import type { WeaponInstance } from '@/models/weapon-instance'
import type { DestinyProfileResponse, InventoryItem } from '@/api/inventory'
import { WEAPON_BUCKET_HASHES, TierType, ItemType } from '@/utils/constants'

// Mock the manifest service
vi.mock('./manifest-service', () => ({
  manifestService: {
    getInventoryItem: vi.fn(),
    getSeasonFromWatermark: vi.fn(),
    isHolofoilWeapon: vi.fn()
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

  describe('parseWeapons', () => {
    function createLegendaryWeaponDef(hash: number) {
      return {
        hash,
        displayProperties: { name: `Weapon ${hash}`, description: '', icon: '' },
        itemTypeDisplayName: 'Hand Cannon',
        itemType: ItemType.Weapon,
        inventory: { tierType: TierType.Superior }
      }
    }

    function createExoticWeaponDef(hash: number) {
      return {
        hash,
        displayProperties: { name: `Exotic ${hash}`, description: '', icon: '' },
        itemTypeDisplayName: 'Exotic Weapon',
        itemType: ItemType.Weapon,
        inventory: { tierType: TierType.Exotic }
      }
    }

    function createRareWeaponDef(hash: number) {
      return {
        hash,
        displayProperties: { name: `Rare ${hash}`, description: '', icon: '' },
        itemTypeDisplayName: 'Rare Weapon',
        itemType: ItemType.Weapon,
        inventory: { tierType: TierType.Rare }
      }
    }

    function createArmorDef(hash: number) {
      return {
        hash,
        displayProperties: { name: `Armor ${hash}`, description: '', icon: '' },
        itemTypeDisplayName: 'Armor',
        itemType: ItemType.Armor,
        inventory: { tierType: TierType.Superior }
      }
    }

    function createInventoryItem(
      itemHash: number,
      bucketHash: number,
      itemInstanceId?: string
    ): InventoryItem {
      return {
        itemHash,
        itemInstanceId,
        bucketHash,
        quantity: 1,
        bindStatus: 0,
        location: 1,
        transferStatus: 0,
        lockable: true,
        state: 0,
        dismantlePermission: 0,
        isWrapper: false
      }
    }

    function createProfile(overrides: Partial<DestinyProfileResponse> = {}): DestinyProfileResponse {
      return {
        profileInventory: { data: { items: [] } },
        characterInventories: { data: {} },
        characterEquipment: { data: {} },
        itemComponents: {
          sockets: { data: {} },
          reusablePlugs: { data: {} },
          instances: { data: {} }
        },
        ...overrides
      }
    }

    beforeEach(() => {
      vi.mocked(manifestService.isHolofoilWeapon).mockReturnValue(false)
    })

    it('returns empty array for profile with no items', () => {
      const profile = createProfile()
      const result = parser.parseWeapons(profile)
      expect(result).toEqual([])
    })

    it('extracts weapons from vault (profileInventory)', () => {
      const weaponHash = 12345
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(createLegendaryWeaponDef(weaponHash) as any)

      const profile = createProfile({
        profileInventory: {
          data: {
            items: [
              createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'inst-1')
            ]
          }
        },
        itemComponents: {
          sockets: {
            data: {
              'inst-1': { sockets: [{ plugHash: 100, isEnabled: true, isVisible: true }] }
            }
          },
          reusablePlugs: { data: {} },
          instances: { data: {} }
        }
      })

      const result = parser.parseWeapons(profile)
      expect(result).toHaveLength(1)
      expect(result[0].itemHash).toBe(weaponHash)
      expect(result[0].itemInstanceId).toBe('inst-1')
    })

    it('extracts weapons from character inventories', () => {
      const weaponHash = 11111
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(createLegendaryWeaponDef(weaponHash) as any)

      const profile = createProfile({
        characterInventories: {
          data: {
            'char-1': {
              items: [createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.ENERGY_WEAPONS, 'inst-2')]
            },
            'char-2': {
              items: [createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.POWER_WEAPONS, 'inst-3')]
            }
          }
        },
        itemComponents: {
          sockets: {
            data: {
              'inst-2': { sockets: [{ plugHash: 100, isEnabled: true, isVisible: true }] },
              'inst-3': { sockets: [{ plugHash: 101, isEnabled: true, isVisible: true }] }
            }
          },
          reusablePlugs: { data: {} },
          instances: { data: {} }
        }
      })

      const result = parser.parseWeapons(profile)
      expect(result).toHaveLength(2)
      expect(result.map(w => w.itemInstanceId)).toContain('inst-2')
      expect(result.map(w => w.itemInstanceId)).toContain('inst-3')
    })

    it('extracts weapons from character equipment', () => {
      const weaponHash = 22222
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(createLegendaryWeaponDef(weaponHash) as any)

      const profile = createProfile({
        characterEquipment: {
          data: {
            'char-1': {
              items: [createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'equipped-1')]
            }
          }
        },
        itemComponents: {
          sockets: {
            data: {
              'equipped-1': { sockets: [{ plugHash: 100, isEnabled: true, isVisible: true }] }
            }
          },
          reusablePlugs: { data: {} },
          instances: { data: {} }
        }
      })

      const result = parser.parseWeapons(profile)
      expect(result).toHaveLength(1)
      expect(result[0].itemInstanceId).toBe('equipped-1')
    })

    it('filters out items not in weapon buckets', () => {
      const weaponHash = 33333
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(createLegendaryWeaponDef(weaponHash) as any)

      const profile = createProfile({
        profileInventory: {
          data: {
            items: [
              createInventoryItem(weaponHash, 99999, 'inst-1'), // Non-weapon bucket
              createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'inst-2') // Weapon bucket
            ]
          }
        },
        itemComponents: {
          sockets: {
            data: {
              'inst-1': { sockets: [{ plugHash: 100, isEnabled: true, isVisible: true }] },
              'inst-2': { sockets: [{ plugHash: 101, isEnabled: true, isVisible: true }] }
            }
          },
          reusablePlugs: { data: {} },
          instances: { data: {} }
        }
      })

      const result = parser.parseWeapons(profile)
      expect(result).toHaveLength(1)
      expect(result[0].itemInstanceId).toBe('inst-2')
    })

    it('filters out items without itemInstanceId', () => {
      const weaponHash = 44444
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(createLegendaryWeaponDef(weaponHash) as any)

      const profile = createProfile({
        profileInventory: {
          data: {
            items: [
              createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, undefined), // No instance ID
              createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'inst-1')
            ]
          }
        },
        itemComponents: {
          sockets: {
            data: {
              'inst-1': { sockets: [{ plugHash: 100, isEnabled: true, isVisible: true }] }
            }
          },
          reusablePlugs: { data: {} },
          instances: { data: {} }
        }
      })

      const result = parser.parseWeapons(profile)
      expect(result).toHaveLength(1)
    })

    it('filters out rare weapons (keeps only legendary and exotic)', () => {
      const legendaryHash = 55555
      const exoticHash = 66666
      const rareHash = 77777

      vi.mocked(manifestService.getInventoryItem).mockImplementation((hash) => {
        if (hash === legendaryHash) return createLegendaryWeaponDef(hash) as any
        if (hash === exoticHash) return createExoticWeaponDef(hash) as any
        if (hash === rareHash) return createRareWeaponDef(hash) as any
        return null
      })

      const profile = createProfile({
        profileInventory: {
          data: {
            items: [
              createInventoryItem(legendaryHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'legendary-1'),
              createInventoryItem(exoticHash, WEAPON_BUCKET_HASHES.ENERGY_WEAPONS, 'exotic-1'),
              createInventoryItem(rareHash, WEAPON_BUCKET_HASHES.POWER_WEAPONS, 'rare-1')
            ]
          }
        },
        itemComponents: {
          sockets: {
            data: {
              'legendary-1': { sockets: [{ plugHash: 100, isEnabled: true, isVisible: true }] },
              'exotic-1': { sockets: [{ plugHash: 101, isEnabled: true, isVisible: true }] },
              'rare-1': { sockets: [{ plugHash: 102, isEnabled: true, isVisible: true }] }
            }
          },
          reusablePlugs: { data: {} },
          instances: { data: {} }
        }
      })

      const result = parser.parseWeapons(profile)
      expect(result).toHaveLength(2)
      expect(result.map(w => w.itemHash)).toContain(legendaryHash)
      expect(result.map(w => w.itemHash)).toContain(exoticHash)
      expect(result.map(w => w.itemHash)).not.toContain(rareHash)
    })

    it('filters out armor items', () => {
      const weaponHash = 88888
      const armorHash = 99999

      vi.mocked(manifestService.getInventoryItem).mockImplementation((hash) => {
        if (hash === weaponHash) return createLegendaryWeaponDef(hash) as any
        if (hash === armorHash) return createArmorDef(hash) as any
        return null
      })

      const profile = createProfile({
        profileInventory: {
          data: {
            items: [
              createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'weapon-1'),
              createInventoryItem(armorHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'armor-1') // Wrong bucket for armor but testing itemType filter
            ]
          }
        },
        itemComponents: {
          sockets: {
            data: {
              'weapon-1': { sockets: [{ plugHash: 100, isEnabled: true, isVisible: true }] },
              'armor-1': { sockets: [{ plugHash: 101, isEnabled: true, isVisible: true }] }
            }
          },
          reusablePlugs: { data: {} },
          instances: { data: {} }
        }
      })

      const result = parser.parseWeapons(profile)
      expect(result).toHaveLength(1)
      expect(result[0].itemHash).toBe(weaponHash)
    })

    it('skips items without socket data', () => {
      const weaponHash = 11111
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(createLegendaryWeaponDef(weaponHash) as any)

      const profile = createProfile({
        profileInventory: {
          data: {
            items: [
              createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'no-sockets'),
              createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'has-sockets')
            ]
          }
        },
        itemComponents: {
          sockets: {
            data: {
              // Only 'has-sockets' has socket data
              'has-sockets': { sockets: [{ plugHash: 100, isEnabled: true, isVisible: true }] }
            }
          },
          reusablePlugs: { data: {} },
          instances: { data: {} }
        }
      })

      const result = parser.parseWeapons(profile)
      expect(result).toHaveLength(1)
      expect(result[0].itemInstanceId).toBe('has-sockets')
    })

    it('parses reusablePlugs in array format', () => {
      const weaponHash = 12345
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(createLegendaryWeaponDef(weaponHash) as any)

      const profile = createProfile({
        profileInventory: {
          data: {
            items: [createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'inst-1')]
          }
        },
        itemComponents: {
          sockets: {
            data: {
              'inst-1': { sockets: [{ plugHash: 100, isEnabled: true, isVisible: true }] }
            }
          },
          reusablePlugs: {
            data: {
              'inst-1': {
                plugs: [
                  { socketIndex: 0, plugItemHash: 200 },
                  { socketIndex: 0, plugItemHash: 201 },
                  { socketIndex: 1, plugItemHash: 300 }
                ]
              }
            }
          },
          instances: { data: {} }
        }
      })

      const result = parser.parseWeapons(profile)
      expect(result).toHaveLength(1)
      expect(result[0].socketPlugsByIndex).toEqual({
        0: [200, 201],
        1: [300]
      })
    })

    it('parses reusablePlugs in object format', () => {
      const weaponHash = 12345
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(createLegendaryWeaponDef(weaponHash) as any)

      const profile = createProfile({
        profileInventory: {
          data: {
            items: [createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'inst-1')]
          }
        },
        itemComponents: {
          sockets: {
            data: {
              'inst-1': { sockets: [{ plugHash: 100, isEnabled: true, isVisible: true }] }
            }
          },
          reusablePlugs: {
            data: {
              'inst-1': {
                plugs: {
                  '0': [{ plugItemHash: 200 }, { plugItemHash: 201 }],
                  '1': [{ plugItemHash: 300 }]
                }
              }
            }
          },
          instances: { data: {} }
        }
      })

      const result = parser.parseWeapons(profile)
      expect(result).toHaveLength(1)
      expect(result[0].socketPlugsByIndex).toEqual({
        0: [200, 201],
        1: [300]
      })
    })

    it('extracts gear tier from instance data', () => {
      const weaponHash = 12345
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(createLegendaryWeaponDef(weaponHash) as any)

      const profile = createProfile({
        profileInventory: {
          data: {
            items: [createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'inst-1')]
          }
        },
        itemComponents: {
          sockets: {
            data: {
              'inst-1': { sockets: [{ plugHash: 100, isEnabled: true, isVisible: true }] }
            }
          },
          reusablePlugs: { data: {} },
          instances: {
            data: {
              'inst-1': {
                gearTier: 4,
                damageType: 1,
                itemLevel: 1,
                quality: 1,
                isEquipped: false,
                canEquip: true,
                equipRequiredLevel: 0,
                unlockHashesRequiredToEquip: [],
                cannotEquipReason: 0
              }
            }
          }
        }
      })

      const result = parser.parseWeapons(profile)
      expect(result).toHaveLength(1)
      expect(result[0].gearTier).toBe(4)
    })

    it('detects holofoil weapons', () => {
      const weaponHash = 12345
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(createLegendaryWeaponDef(weaponHash) as any)
      vi.mocked(manifestService.isHolofoilWeapon).mockReturnValue(true)

      const profile = createProfile({
        profileInventory: {
          data: {
            items: [createInventoryItem(weaponHash, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'inst-1')]
          }
        },
        itemComponents: {
          sockets: {
            data: {
              'inst-1': { sockets: [{ plugHash: 100, isEnabled: true, isVisible: true }] }
            }
          },
          reusablePlugs: { data: {} },
          instances: { data: {} }
        }
      })

      const result = parser.parseWeapons(profile)
      expect(result).toHaveLength(1)
      expect(result[0].isHolofoil).toBe(true)
    })

    it('handles missing manifest definition gracefully', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(null)

      const profile = createProfile({
        profileInventory: {
          data: {
            items: [createInventoryItem(99999, WEAPON_BUCKET_HASHES.KINETIC_WEAPONS, 'inst-1')]
          }
        },
        itemComponents: {
          sockets: {
            data: {
              'inst-1': { sockets: [{ plugHash: 100, isEnabled: true, isVisible: true }] }
            }
          },
          reusablePlugs: { data: {} },
          instances: { data: {} }
        }
      })

      const result = parser.parseWeapons(profile)
      expect(result).toHaveLength(0)
    })
  })

  describe('getWeaponIconWatermark', () => {
    it('returns version watermark when available', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue({
        displayProperties: { name: 'Test', description: '', icon: '' },
        itemType: 3,
        iconWatermark: '/base-watermark.png',
        quality: {
          displayVersionWatermarkIcons: ['/v0.png', '/v1.png', '/v2.png'],
          currentVersion: 2
        }
      } as any)

      const result = parser.getWeaponIconWatermark(12345)
      expect(result).toBe('/v2.png')
    })

    it('falls back to base watermark when no version available', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue({
        displayProperties: { name: 'Test', description: '', icon: '' },
        itemType: 3,
        iconWatermark: '/base-watermark.png'
      } as any)

      const result = parser.getWeaponIconWatermark(12345)
      expect(result).toBe('/base-watermark.png')
    })

    it('returns undefined for missing definition', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue(null)

      const result = parser.getWeaponIconWatermark(99999)
      expect(result).toBeUndefined()
    })
  })

  describe('getWeaponSeasonName', () => {
    it('returns season name when watermark mapping exists', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue({
        displayProperties: { name: 'Test', description: '', icon: '' },
        itemType: 3,
        iconWatermark: '/watermark.png'
      } as any)
      vi.mocked(manifestService.getSeasonFromWatermark).mockReturnValue(28)

      const result = parser.getWeaponSeasonName(12345)
      expect(result).toBe('Season 28')
    })

    it('returns undefined when no season mapping exists', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue({
        displayProperties: { name: 'Test', description: '', icon: '' },
        itemType: 3,
        iconWatermark: '/unknown-watermark.png'
      } as any)
      vi.mocked(manifestService.getSeasonFromWatermark).mockReturnValue(undefined)

      const result = parser.getWeaponSeasonName(12345)
      expect(result).toBeUndefined()
    })
  })

  describe('groupWeaponsByNameAndSeason', () => {
    it('groups weapons by name and season number', () => {
      vi.mocked(manifestService.getInventoryItem).mockImplementation((hash) => ({
        displayProperties: { name: hash < 20000 ? 'Austringer' : 'Beloved', description: '', icon: '' },
        itemType: 3,
        iconWatermark: hash < 20000 ? '/season17.png' : '/season20.png'
      } as any))

      vi.mocked(manifestService.getSeasonFromWatermark).mockImplementation((watermark) => {
        if (watermark === '/season17.png') return 17
        if (watermark === '/season20.png') return 20
        return undefined
      })

      const weapons: WeaponInstance[] = [
        createWeaponInstance('1', 12345), // Austringer S17
        createWeaponInstance('2', 12346), // Austringer S17 (holofoil)
        createWeaponInstance('3', 23456)  // Beloved S20
      ]

      const result = parser.groupWeaponsByNameAndSeason(weapons)

      expect(result.size).toBe(2)
      expect(result.get('Austringer|season-17')).toHaveLength(2)
      expect(result.get('Beloved|season-20')).toHaveLength(1)
    })

    it('uses season 0 when watermark has no season mapping', () => {
      vi.mocked(manifestService.getInventoryItem).mockReturnValue({
        displayProperties: { name: 'Unknown Weapon', description: '', icon: '' },
        itemType: 3,
        iconWatermark: '/unknown.png'
      } as any)

      vi.mocked(manifestService.getSeasonFromWatermark).mockReturnValue(undefined)

      const weapons: WeaponInstance[] = [createWeaponInstance('1', 12345)]
      const result = parser.groupWeaponsByNameAndSeason(weapons)

      expect(result.has('Unknown Weapon|season-0')).toBe(true)
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
