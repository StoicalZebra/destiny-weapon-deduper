# Architecture Overview

Technical architecture documentation for Destiny Weapon Deduper.

---

## Table of Contents

1. [Bungie Manifest System](#bungie-manifest-system)
2. [Data Flow Overview](#data-flow-overview)
3. [Storage Architecture](#storage-architecture)
4. [Key Services](#key-services)
5. [Debugging Tips](#debugging-tips)
6. [Weapon Socket Terminology](#weapon-socket-terminology)
7. [Masterwork System](#masterwork-system)
8. [Holofoil Weapon System](#holofoil-weapon-system)

---

## Bungie Manifest System

The Bungie Manifest is the source of all Destiny 2 game definitions (weapons, perks, stats, etc.). It's approximately 200MB+ and updated with each game patch.

### What's in the Manifest?

The app downloads **6 definition tables**:

| Table | Purpose | Size |
|-------|---------|------|
| `DestinyInventoryItemDefinition` | Weapon/armor/item definitions | ~100k items |
| `DestinyPlugSetDefinition` | Perk options per socket | ~5k sets |
| `DestinySocketCategoryDefinition` | Socket categories (barrels, traits, etc.) | Small |
| `DestinySocketTypeDefinition` | Socket type metadata | Small |
| `DestinyStatDefinition` | Weapon stat definitions (range, stability, etc.) | Small |
| `DestinySandboxPerkDefinition` | Perk trait definitions | Medium |

### How We Fetch It

```
┌─────────────────────────────────────────────────────────────┐
│  1. GET /Platform/Destiny2/Manifest/                         │
│     Returns: version string + paths to all definition files │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Download each table from Bungie CDN                      │
│     URL pattern: https://www.bungie.net{tablePath}          │
│     Downloads with progress tracking (streaming API)         │
└─────────────────────────────────────────────────────────────┘
```

**Key file:** `src/api/manifest.ts`

### Version Checking & Refresh

On app startup:

```
┌──────────────────────┐
│  App Startup         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     ┌─────────────────────┐
│ Check IndexedDB for  │────►│ Cached version      │
│ cached version       │     │ exists?             │
└──────────────────────┘     └──────────┬──────────┘
                                        │
                        ┌───────────────┴───────────────┐
                        │                               │
                       YES                              NO
                        │                               │
                        ▼                               ▼
           ┌────────────────────────┐    ┌─────────────────────────┐
           │ Fetch latest version   │    │ Download all tables     │
           │ from Bungie API        │    │ (shows progress UI)     │
           └───────────┬────────────┘    └─────────────────────────┘
                       │
                       ▼
           ┌────────────────────────┐
           │ Versions match?        │
           └───────────┬────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
          YES                      NO
           │                       │
           ▼                       ▼
   ┌───────────────┐    ┌─────────────────────────┐
   │ Load from     │    │ Re-download all tables  │
   │ IndexedDB     │    │ (shows progress UI)     │
   │ (~100ms)      │    └─────────────────────────┘
   └───────────────┘
```

**Key file:** `src/stores/manifest.ts`

### When Does It Refresh?

| Trigger | What Happens |
|---------|--------------|
| **App startup** | Automatic version check + refresh if needed |
| **New Destiny patch** | Next app load detects new version, re-downloads |
| **Manual clear** | Call `manifestStore.clearManifest()` then refresh page |

There's a `checkForUpdates()` method available but not auto-triggered during sessions. Users just need to refresh the browser after a Destiny update.

### Hash Format Gotcha

Bungie uses signed 32-bit integers for hashes, but JavaScript stores them as 64-bit floats. The manifest service handles both formats:

```typescript
// In manifest-service.ts
let definition = table[hash]  // Try as-is
if (!definition) {
  const alternateHash = hash < 0 ? hash >>> 0 : hash | 0  // Convert format
  definition = table[alternateHash]
}
```

---

## Data Flow Overview

### App Initialization

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  main.ts    │────►│ Initialize  │────►│ Load        │
│  app.mount  │     │ manifest    │     │ from IDB    │
└─────────────┘     │ store       │     │ or download │
                    └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                    ┌─────────────┐     ┌─────────────┐
                    │ App ready   │◄────│ Load into   │
                    │ (router     │     │ memory      │
                    │  enabled)   │     │ cache       │
                    └─────────────┘     └─────────────┘
```

### Weapon Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LOGS IN                              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Bungie API: GET /Destiny2/{membershipType}/Profile/            │
│  Returns: Raw inventory items (hashes + instance data)          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  weapon-parser.ts                                                │
│  - Filter to legendary weapons only                              │
│  - Look up definitions from manifest                             │
│  - Parse socket/perk data into WeaponInstance models             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  deduplication.ts                                                │
│  - Group instances by weapon hash                                │
│  - Merge perk columns across all instances                       │
│  - Create DedupedWeapon models with all earned combinations      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  weapons store (Pinia)                                           │
│  - Reactive state for UI                                         │
│  - Sorting, filtering, searching                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Vue Components                                                  │
│  - WeaponList.vue → WeaponCard.vue                               │
│  - WeaponDetailView.vue → WeaponMatrix.vue                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Storage Architecture

The app uses multiple storage mechanisms for different data types:

### Storage Overview

| Data | Storage | Location | Why |
|------|---------|----------|-----|
| Manifest tables | IndexedDB | `d3deduper.manifest` | Too large for localStorage (~200MB) |
| Preset wishlists | IndexedDB | `d3deduper.wishlists` | Large files (Voltron ~10MB) |
| User wishlists (<1000 items) | localStorage | `d3_wishlist_*` | Fast synchronous access |
| User wishlists (≥1000 items) | IndexedDB | `d3deduper.wishlists` | Avoid localStorage limits |
| Wishlist enabled states | localStorage | `d3_wishlist_enabled_states` | Lightweight, instant toggle |
| God rolls | localStorage | `d3_godroll_*` | Small, user-specific |
| Auth tokens | localStorage | `d3_auth_*` | Standard auth pattern |
| Recent searches | localStorage | `d3_recent_searches` | Small, user-specific |

### IndexedDB Schema

```
Database: d3deduper (version 2)
├── Store: manifest
│   ├── key: "DestinyInventoryItemDefinition" → {hash: definition, ...}
│   ├── key: "DestinyPlugSetDefinition" → {hash: definition, ...}
│   ├── key: "DestinySocketCategoryDefinition" → {...}
│   ├── key: "DestinySocketTypeDefinition" → {...}
│   ├── key: "DestinyStatDefinition" → {...}
│   ├── key: "DestinySandboxPerkDefinition" → {...}
│   └── key: "version" → "manifest-version-string"
│
└── Store: wishlists
    ├── key: "voltron" → {id, name, items: [...], ...}
    ├── key: "user-wishlist-123" → {...}
    └── ...
```

**Key file:** `src/utils/storage.ts`

### Wishlist Performance Optimizations

The wishlist system handles large datasets (Voltron has 100k+ items). Key optimizations:

1. **Separate enabled state storage** - Toggling writes ~50 bytes instead of 10MB
2. **Separate reactive Map** - `enabledStates` doesn't trigger re-renders of wishlist data
3. **Pre-built weapon indexes** - `Map<wishlistId, Map<weaponHash, WishlistItem[]>>` for O(1) lookups

**Key file:** `src/stores/wishlists.ts`

---

## Key Services

### Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vue Components                           │
└──────────────────────────────┬──────────────────────────────────┘
                               │ consume
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Pinia Stores                                │
│  auth.ts │ manifest.ts │ weapons.ts │ wishlists.ts               │
└──────────────────────────────┬──────────────────────────────────┘
                               │ use
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Services                                  │
│  manifest-service.ts │ weapon-parser.ts │ deduplication.ts      │
│  wishlist-storage-service.ts │ godroll-storage-service.ts       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ call
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
│  auth.ts │ inventory.ts │ manifest.ts                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Bungie.net API     │
                    └─────────────────────┘
```

### Key Service Files

| Service | Purpose |
|---------|---------|
| `src/services/manifest-service.ts` | In-memory manifest cache + lookups |
| `src/services/weapon-parser.ts` | Raw API → WeaponInstance models |
| `src/services/deduplication.ts` | WeaponInstance[] → DedupedWeapon |
| `src/services/wishlist-storage-service.ts` | IndexedDB/localStorage CRUD for wishlists |
| `src/services/dim-wishlist-parser.ts` | Parse DIM .txt format wishlists |
| `src/services/godroll-storage-service.ts` | localStorage CRUD for god rolls |

---

## Debugging Tips

### Inspect IndexedDB

1. DevTools → Application → IndexedDB → `d3deduper`
2. Click `manifest` store to see all cached tables
3. Look up any hash in `DestinyInventoryItemDefinition`

### Force Manifest Refresh

```javascript
// In browser console
const store = useManifestStore()
await store.clearManifest()
location.reload()
```

### Check Manifest Version

```javascript
// In browser console
const store = useManifestStore()
console.log('Cached:', store.version)
const hasUpdate = await store.checkForUpdates()
console.log('Update available:', hasUpdate)
```

### Inspect Perk Definition

```javascript
// In browser console
import { manifestService } from '@/services/manifest-service'
const perk = manifestService.getInventoryItem(247725512)  // Rapid Hit hash
console.log(perk.displayProperties.name)  // "Rapid Hit"
console.log(perk.itemTypeDisplayName)     // "Trait" or "Enhanced Trait"
```

---

## Weapon Socket Terminology

Bungie uses a "socket and plug" system for weapon customization. Understanding the official terminology helps when working with the manifest data.

### Socket Categories

Socket categories group related sockets together. Defined in `DestinySocketCategoryDefinition`:

| Hash | Display Name | Contents |
|------|--------------|----------|
| `4241085061` | **WEAPON PERKS** | Trait columns (1 & 2), Origin Trait |
| `3956125808` | **INTRINSIC TRAITS** | Weapon frame/intrinsic |

Our code references these in `src/utils/constants.ts`:
```typescript
export const SOCKET_CATEGORY_WEAPON_PERKS = 4241085061
export const SOCKET_CATEGORY_INTRINSIC_TRAITS = 3956125808
```

### Socket Types

Individual socket types are defined in `DestinySocketTypeDefinition`. The `displayProperties.name` field contains the official Bungie term:

| Our Term | Bungie Socket Type Names | Notes |
|----------|-------------------------|-------|
| Barrel | Barrels, Scopes, Sights, Bowstrings, Rails, Launch Tubes | Varies by weapon archetype |
| Magazine | Magazines, Batteries, Arrows, Bolts, Ammunition | Varies by weapon archetype |
| Trait 1 | Trait | Left perk column |
| Trait 2 | Trait | Right perk column (same name, different index) |
| Origin Trait | Origin Trait | Source-specific perk |
| Masterwork | Masterwork | Stat bonus socket |
| Intrinsic | Intrinsic | Weapon frame (Lightweight, Aggressive, etc.) |

### Sockets We Don't Display

These exist in weapons but aren't shown in our perk matrix:

| Socket Type | Purpose | Why Hidden |
|-------------|---------|------------|
| Weapon Mod | Counterbalance Stock, Backup Mag, etc. | User-applied, not random rolls |
| Tracker | Kill tracker | Non-random, cosmetic |
| Memento | Crafted weapon flair | Crafting-specific |
| Shader | Weapon appearance | Cosmetic only |

### How DIM Handles This

DIM pulls socket names directly from the manifest rather than hardcoding:
```typescript
socketCategory.displayProperties.name  // e.g., "WEAPON PERKS"
socketType.displayProperties.name      // e.g., "Barrels", "Trait"
```

This is the authoritative approach - if Bungie changes terminology, the UI updates automatically.

### Our Implementation

In `deduplication.ts`, we classify columns using pattern matching on socket type names:

```typescript
const BARREL_TYPE_NAMES = new Set(['barrel', 'rail', 'scope', 'sight', 'bowstring'])
const MAGAZINE_TYPE_NAMES = new Set(['magazine', 'battery', 'bolt', 'bolts', 'arrow', 'ammunition'])
```

This allows us to group related socket types (e.g., "Scopes" and "Barrels" both map to our "barrel" column kind).

---

## Masterwork System

Masterwork stats provide bonus stats to weapons. Each weapon instance has one equipped masterwork, and this section documents how we detect and display them.

### How Bungie Represents Masterworks

Masterwork plugs are identified by multiple signals:

| Property | Value/Pattern |
|----------|---------------|
| `plug.plugCategoryIdentifier` | Contains `'masterworks.stat'` (most reliable) |
| `itemTypeDisplayName` | `"Masterwork"` |
| `displayProperties.name` | Stat name like `"Range Masterwork"`, `"Tier 3: Stability"` |

**False positives to filter:**
- `"Tier X"` - tier tracking perks, not actual masterworks
- `"Random Masterwork"` - placeholder
- `"Empty Mod Socket"` - empty slot

### Per-Instance Masterwork Display

Unlike the perk matrix (which shows merged perks across all instances), masterwork is displayed **per weapon instance** since users need to know which specific masterwork stat is on each copy.

**Data flow:**
1. `buildPerkMatrix()` identifies the masterwork socket index during deduplication
2. `DedupedWeapon.masterworkSocketIndex` stores this index
3. `getInstanceMasterwork(instance, socketIndex)` looks up the equipped masterwork for a specific instance
4. `InstancePerkGrid.vue` displays the masterwork below the perk grid

**Key functions in `deduplication.ts`:**
```typescript
// Detect if a plug hash is a masterwork
function isMasterworkPlug(hash: number): boolean

// Filter for display (excludes tier trackers, placeholders)
function isMasterworkDisplayCandidate(hash: number): boolean

// Get masterwork info for a specific instance
export function getInstanceMasterwork(
  instance: WeaponInstance,
  masterworkSocketIndex: number | undefined
): { hash: number; name: string; icon: string } | null
```

### UI Display

Each instance card shows its equipped masterwork below the perk grid:
- Small icon (20px) with colored ring
- Gold ring (`ring-yellow-600`) for masterwork
- Stat name displayed next to icon (e.g., "Tier 3: Cooling Efficiency")

---

## Holofoil Weapon System

Holofoil weapons are cosmetic "shiny" variants of regular weapons introduced in Destiny 2. They share the same name but have different item hashes in Bungie's API.

### How Bungie Represents Holofoil

| Property | Normal | Holofoil |
|----------|--------|----------|
| `itemHash` | e.g., `1323862250` | e.g., `1556004989` (different) |
| `displayProperties.name` | "Riptide" | "Riptide" (same) |
| `isHolofoil` | `false`/`undefined` | `true` |
| `iconWatermark` | Season watermark | Same season watermark |
| Perks/stats | Standard pool | Same pool |

### Our Grouping Strategy

We group weapons by **name + season watermark** instead of just `itemHash`:

1. **Parse weapons** - Tag each instance with `isHolofoil` from manifest
2. **Group by key** - Use `${weaponName}|${iconWatermark}` as group key
3. **Build DedupedWeapon** - Merge perks from all instances (both variants)
4. **Track variants** - `variantHashes[]` array with holofoil status per hash
5. **Display** - Show both hashes on cards with "Normal/Holofoil" labels

**Key files:**
- `src/services/weapon-parser.ts` - `groupWeaponsByNameAndSeason()`
- `src/services/deduplication.ts` - `collectVariantHashes()`, `buildDedupedWeapon()`
- `src/models/deduped-weapon.ts` - `WeaponVariantInfo`, `variantHashes`, `hasHolofoil`

### Data Model

```typescript
// Tracks variant information for weapons with multiple hashes
interface WeaponVariantInfo {
  hash: number
  isHolofoil: boolean
}

// DedupedWeapon now includes:
interface DedupedWeapon {
  // ... existing fields ...
  variantHashes: WeaponVariantInfo[]  // All variant hashes (sorted: normal first)
  hasHolofoil: boolean                 // Convenience flag for UI
}

// WeaponInstance now includes:
interface WeaponInstance {
  // ... existing fields ...
  isHolofoil?: boolean  // True if this instance is a holofoil variant
}
```

### UI Indicators

| Location | Display |
|----------|---------|
| **WeaponCompactCard** | Single variant: "Hash ...XXXX"; Multiple: "Normal ...XXXX" / "Holofoil ...XXXX" (purple text) |
| **Instance cards** | Purple "Holofoil" pill badge next to instance ID |
| **Detail header** | Could show combined icon or indicate variants exist |

### Edge Cases

- **Same season, different names**: Not grouped (different weapons)
- **No watermark data**: Uses "no-watermark" as fallback key
- **Mixed ownership**: Could own only holofoil OR only normal (both tracked)
- **Only one variant owned**: Card displays single hash without labels

---

## Multi-Variant Wishlist Matching

Weapons with multiple hashes (e.g., holofoil + normal variants) present a challenge for wishlist matching. A roll saved under one hash must still match inventory items with the other hash.

### The Problem Visualized

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DESTINY 2 MANIFEST                                  │
│                                                                             │
│   "All Or Nothing" exists as TWO separate items:                            │
│                                                                             │
│   ┌──────────────────────┐    ┌──────────────────────┐                      │
│   │ Hash: 1954466322     │    │ Hash: 2348522233     │                      │
│   │ Name: All Or Nothing │    │ Name: All Or Nothing │                      │
│   │ Season: 26           │    │ Season: 26           │                      │
│   │ Type: Normal         │    │ Type: Holofoil       │                      │
│   └──────────────────────┘    └──────────────────────┘                      │
│                                                                             │
│   Same weapon, same perks, different visual variant = different hash        │
└─────────────────────────────────────────────────────────────────────────────┘
```

When a user saves a wishlist roll, it stores ONE hash:

```
┌─────────────────────────────────────────┐
│ WishlistItem stored in IndexedDB:       │
│                                         │
│   weaponHash: 1954466322  <-- Only ONE  │
│   perkHashes: [456, 789, 123]           │
│   notes: "My PvP roll"                  │
└─────────────────────────────────────────┘
```

### Without Multi-Variant Solution (Broken)

```
┌─────────────────────┐    ┌─────────────────────┐
│ Instance A          │    │ Instance B          │
│ Hash: 1954466322    │    │ Hash: 2348522233    │
│ (Normal)            │    │ (Holofoil)          │
└─────────────────────┘    └─────────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐
│ Lookup: 1954466322  │    │ Lookup: 2348522233  │
│ Result: MATCH       │    │ Result: NO MATCH    │
│ (shows wishlist)    │    │ (wishlist missing!) │
└─────────────────────┘    └─────────────────────┘

The holofoil version doesn't show the wishlist roll!
```

### Solution: Variant-Aware Lookup

We solve this at **lookup time**, not storage time. This preserves DIM format compatibility while ensuring rolls match all variants.

#### Step 1: Build Variant Map (happens once at manifest load)

```
manifestService scans all weapons, groups by name + season:

variantGroups Map:
┌─────────────────────────────────────────────────────────────┐
│  1954466322 --> [1954466322, 2348522233]  (All Or Nothing)  │
│  2348522233 --> [1954466322, 2348522233]  (All Or Nothing)  │
│  3146657388 --> [3146657388, 1234567890]  (Modified B-7)    │
│  1234567890 --> [3146657388, 1234567890]  (Modified B-7)    │
│  9999999999 --> [9999999999]              (Solo weapon)     │
└─────────────────────────────────────────────────────────────┘

O(1) lookup: any hash --> all related hashes
```

#### Step 2: Variant-Aware Lookup

```
┌─────────────────────┐
│ Instance B          │
│ Hash: 2348522233    │
│ (Holofoil)          │
└─────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ getWeaponVariantHashes(2348522233)      │
│ Returns: [1954466322, 2348522233]       │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Check wishlist index for EACH hash:     │
│                                         │
│   index.get(1954466322) --> FOUND!      │
│   index.get(2348522233) --> (empty)     │
│                                         │
│ Result: Match found via variant hash    │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Holofoil shows wishlist roll!           │
└─────────────────────────────────────────┘
```

### DIM Export with Multi-Variant Support

```
Stored WishlistItem:
┌─────────────────────────────────────────┐
│ weaponHash: 1954466322                  │
│ perkHashes: [456, 789]                  │
│ notes: "PvP roll"                       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ getWeaponVariantHashes(1954466322)      │
│ Returns: [1954466322, 2348522233]       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ OUTPUT (one line per variant):          │
│                                         │
│ dimwishlist:item=1954466322&perks=...   │  <-- Normal
│ dimwishlist:item=2348522233&perks=...   │  <-- Holofoil
│                                         │
│ DIM will now match BOTH variants!       │
└─────────────────────────────────────────┘
```

### Implementation

#### 1. Pre-computed Variant Groups (`manifest-service.ts`)

```typescript
// Built once during manifest load
private variantGroups: Map<number, number[]> = new Map()

private buildVariantGroups(table: Record<string, DestinyInventoryItemDefinition>): void {
  const groupsByKey = new Map<string, number[]>()

  for (const def of Object.values(table)) {
    if (def.itemType !== 3) continue  // Only weapons

    const name = def.displayProperties?.name
    const groupKey = def.seasonHash
      ? `${name}|season:${def.seasonHash}`
      : `${name}|watermark:${def.iconWatermark}`

    groupsByKey.get(groupKey)?.push(def.hash) ?? groupsByKey.set(groupKey, [def.hash])
  }

  // Map each hash to its full variant array
  for (const hashes of groupsByKey.values()) {
    for (const hash of hashes) {
      this.variantGroups.set(hash, hashes)
    }
  }
}

getWeaponVariantHashes(hash: number): number[] {
  return this.variantGroups.get(hash) ?? [hash]
}
```

#### 2. Variant-Aware Wishlist Lookup (`wishlists.ts`)

```typescript
function getItemsForWeaponVariants(
  variantHashes: number[]
): Array<{ wishlist: Wishlist; items: WishlistItem[] }> {
  const results = []
  const seenItems = new Set<string>()

  for (const wishlist of enabledWishlists) {
    const matchingItems: WishlistItem[] = []

    // Check ALL variant hashes
    for (const hash of variantHashes) {
      const items = weaponIndex.get(hash) || []
      for (const item of items) {
        if (!seenItems.has(item.id)) {
          seenItems.add(item.id)
          matchingItems.push(item)
        }
      }
    }

    if (matchingItems.length > 0) {
      results.push({ wishlist, items: matchingItems })
    }
  }

  return results
}
```

#### 3. Multi-Hash DIM Export (`dim-wishlist-parser.ts`)

```typescript
// Export outputs one line per variant hash
for (const item of weaponItems) {
  const variantHashes = options?.getVariantHashes?.(item.weaponHash) ?? [item.weaponHash]

  for (const hash of variantHashes) {
    lines.push(serializeItem(item, hash))
  }
}
```

### Where Variant-Aware Lookup is Used

| Location | Method | Purpose |
|----------|--------|---------|
| `WeaponDetailUnified.vue` | `getItemsForWeaponVariants()` | Perk annotations & saved rolls list |
| `WishlistsApplied.vue` | Loops through `variantHashes` prop | Sidebar wishlist counts |
| `wishlists.ts` export | `getVariantHashes` callback | DIM format export |

### Key Insight

```
We DON'T change how data is stored:

┌───────────────────────┐
│ WishlistItem          │
│   weaponHash: NUMBER  │  <-- Still stores ONE hash
│   perkHashes: [...]   │
└───────────────────────┘

We change how data is QUERIED:

Before: index.get(weaponHash)          <-- Single hash lookup
After:  for each hash in variants:     <-- Check ALL variant hashes
          index.get(hash)

Benefits:
- No migration needed for existing data
- Premade wishlists work automatically
- DIM format compatibility preserved
- O(1) variant lookup (pre-computed map)
```

---

## Local Development with Mock Data

Due to Bungie OAuth limitations (single redirect URI per app), local development uses mock inventory data instead of live API calls.

### Why Mock Mode?

Bungie OAuth only allows one redirect URI per registered application. Our app uses the production Vercel URL (`https://destiny-weapon-deduper.vercel.app/callback`), so local dev at `localhost:5173` cannot complete OAuth authentication.

**Solution**: Set `VITE_USE_MOCK=true` in `.env.local` to load from `data/mock-inventory.json` instead of the live API.

### Syncing Mock Data with Your Account

When your in-game inventory changes (acquired/dismantled weapons), sync the mock data:

1. Go to production app: https://destiny-weapon-deduper.vercel.app
2. Log in with Bungie
3. Navigate to About page, scroll to bottom
4. Expand "Developer Tools" section
5. Click "Export Inventory JSON"
6. Copy downloaded file to `data/mock-inventory.json`
7. Restart local dev server: `npm run dev`

### When to Sync

Sync your mock data when:
- You've acquired new weapons in-game
- You've dismantled weapons since last sync
- Local app shows weapons you no longer have
- You want to add new weapons to your wishlist

### Wishlist Editing

Wishlists with **500 rolls or fewer** can be edited directly in the app (both locally and on production). Larger wishlists like Voltron are view-only with a link to GitHub.

**Size-based permissions:**
| Wishlist Size | View | Edit | Export |
|---------------|------|------|--------|
| ≤500 rolls | Yes | Yes | Yes |
| >500 rolls | GitHub link only | No | No |

**Editing workflow:**
1. Go to Wishlists page
2. Click "View / Edit" on any premade wishlist under 500 rolls
3. Make changes via weapon detail pages
4. Export changes when done
5. For StoicalZebra: run `./scripts/publish-wishlist.sh` to push to GitHub

The publish script copies the exported file to `data/wishlists/StoicalZebra-wishlist.txt` and pushes to GitHub.
