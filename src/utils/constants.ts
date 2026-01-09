// Bungie API Base URLs
export const BUNGIE_API_BASE = 'https://www.bungie.net/Platform'
export const BUNGIE_ROOT = 'https://www.bungie.net'

// Manifest endpoints
export const MANIFEST_ENDPOINT = `${BUNGIE_API_BASE}/Destiny2/Manifest/`

// Component IDs for profile requests
export enum DestinyComponentType {
  Profiles = 100,
  VendorReceipts = 101,
  ProfileInventories = 102,
  ProfileCurrencies = 103,
  ProfileProgression = 104,
  PlatformSilver = 105,
  Characters = 200,
  CharacterInventories = 201,
  CharacterProgressions = 202,
  CharacterRenderData = 203,
  CharacterActivities = 204,
  CharacterEquipment = 205,
  ItemInstances = 300,
  ItemObjectives = 301,
  ItemPerks = 302,
  ItemRenderData = 303,
  ItemStats = 304,
  ItemSockets = 305,
  ItemTalentGrids = 306,
  ItemCommonData = 307,
  ItemPlugStates = 308,
  ItemPlugObjectives = 309,
  ItemReusablePlugs = 310,
}

// Item bucket hashes (where items can be stored)
export const WEAPON_BUCKET_HASHES = {
  KINETIC_WEAPONS: 1498876634,
  ENERGY_WEAPONS: 2465295065,
  POWER_WEAPONS: 953998645,
  GENERAL: 138197802, // General inventory bucket
  LOST_ITEMS: 215593132, // Postmaster/Lost Items
}

// Item tier types
export enum TierType {
  Unknown = 0,
  Currency = 1,
  Basic = 2,
  Common = 3,
  Rare = 4,
  Superior = 5, // Legendary
  Exotic = 6,
}

// Item types
export enum ItemType {
  None = 0,
  Currency = 1,
  Armor = 2,
  Weapon = 3,
  Message = 7,
  Engram = 8,
  Consumable = 9,
  ExchangeMaterial = 10,
  MissionReward = 11,
  QuestStep = 12,
  QuestStepComplete = 13,
  Emblem = 14,
  Quest = 15,
  Subclass = 16,
  ClanBanner = 17,
  Aura = 18,
  Mod = 19,
  Dummy = 20,
  Ship = 21,
  Vehicle = 22,
  Emote = 23,
  Ghost = 24,
  Package = 25,
  Bounty = 26,
  Wrapper = 27,
  SeasonalArtifact = 28,
  Finisher = 29,
}

// Socket category hashes (for identifying perk columns)
export const SOCKET_CATEGORY_WEAPON_PERKS = 4241085061
export const SOCKET_CATEGORY_INTRINSIC_TRAITS = 3956125808

// Manifest definition tables we need
export const REQUIRED_MANIFEST_TABLES = [
  'DestinyInventoryItemDefinition',
  'DestinySocketCategoryDefinition',
  'DestinySocketTypeDefinition',
  'DestinyPlugSetDefinition',
  'DestinyStatDefinition',
  'DestinySandboxPerkDefinition',
] as const

export type ManifestTableName = typeof REQUIRED_MANIFEST_TABLES[number]

// IndexedDB configuration
export const DB_NAME = 'd3deduper'
export const DB_VERSION = 1
export const MANIFEST_STORE_NAME = 'manifest'
export const MANIFEST_VERSION_KEY = 'manifest_version'
