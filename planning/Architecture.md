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
7. [Enhanced Perk System](#enhanced-perk-system)

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

## Enhanced Perk System

Destiny 2 weapons can have "enhanced" versions of perks that provide slightly improved benefits. This section documents how Bungie represents enhanced perks and how our app handles them.

### How Bungie Represents Enhanced Perks

Enhanced perks are **separate inventory items** with their own hashes. Both base and enhanced versions share the same display name (e.g., both are "Rapid Hit"), but differ in:

| Property | Base Perk | Enhanced Perk |
|----------|-----------|---------------|
| `inventory.tierType` | 2 (Basic) | 3 (Common) |
| `itemTypeDisplayName` | "Trait" | "Enhanced Trait" |
| `displayProperties.name` | "Rapid Hit" | "Rapid Hit" |
| Hash | Different | Different |

**Historical note:** Prior to ~2023, some enhanced perks had "Enhanced" in their display name (e.g., "Enhanced Rapid Hit"). Our `isEnhancedPerkName()` helper handles these legacy cases.

### The Missing Enhanced Variant Problem

**Issue:** Some weapons don't list enhanced variants in their plug sets, even when the enhanced version exists in the global manifest.

**Example:** "Roar of Battle" origin trait on The Martlet:
- Base hash: `1673863459` - Listed in weapon's plug set ✓
- Enhanced hash: `4236235115` - Exists in manifest, but NOT in weapon's plug set ✗

**Root cause:** This is a known pattern in Bungie's manifest data. Not all enhanced variants are included in every weapon's plug set, even when they should be available.

### How Other Apps Handle This

#### DIM (Destiny Item Manager)

DIM uses a **pre-generated global lookup table** built from the entire manifest:

1. **Build-time generation** ([d2-additional-info repo](https://github.com/DestinyItemManager/d2-additional-info)):
   - Scans ALL plug sets for trait pairs
   - Scans ALL inventory items' socket entries
   - Matches perks by: exact name OR name + " Enhanced" suffix
   - Filters by tier type: Basic (base) vs Common (enhanced)

2. **Output**: Static JSON mapping `{ baseHash: enhancedHash }` stored in [trait-to-enhanced-trait.json](https://raw.githubusercontent.com/DestinyItemManager/DIM/master/src/data/d2/trait-to-enhanced-trait.json)

3. **Usage**: When displaying perks, DIM looks up enhanced variants from this global map, not just the weapon's plug set

#### Little Light

- Uses Bungie API's native plug set structure directly
- Less sophisticated enhanced perk handling
- No explicit global mapping logic found

### Our Solution: Runtime Global Mapping

We generate a global trait-to-enhanced-trait mapping at runtime when the manifest loads.

**Algorithm:**
1. Iterate all plug sets in `DestinyPlugSetDefinition`
2. For each plug set, separate perks by tier type (Basic vs Common)
3. Match base and enhanced perks by display name
4. Store bidirectional mapping: `baseToEnhanced` and `enhancedToBase`

**Key functions in `manifest-service.ts`:**
```typescript
// Get enhanced variant hash for a base perk
getEnhancedVariant(baseHash: number): number | undefined

// Get base variant hash for an enhanced perk
getBaseVariant(enhancedHash: number): number | undefined
```

**Integration in `deduplication.ts`:**
When building perk columns, if we find a base perk without an enhanced variant in the weapon's plug set, we check the global mapping to add the enhanced variant metadata.

**Performance:**
- One-time scan on manifest load (~100ms)
- Memory: ~5-10KB for mapping
- O(1) lookups after initialization

### Enhanced Perk Detection

**Primary detection** (modern perks):
```typescript
function isEnhancedPerk(hash: number): boolean {
  const perkDef = manifestService.getInventoryItem(hash)
  const itemTypeDisplayName = perkDef?.itemTypeDisplayName?.toLowerCase() || ''
  return itemTypeDisplayName.startsWith('enhanced ')
}
```

**Fallback detection** (legacy perks with "Enhanced" in name):
```typescript
function isEnhancedPerkName(name: string): boolean {
  return /^enhanced\s+/i.test(name)
}
```

### Columns Supporting Enhanced Variants

| Column | Supports Enhanced |
|--------|-------------------|
| Barrel | Yes |
| Magazine | Yes |
| Left Trait (Weapon Perk 1) | Yes |
| Right Trait (Weapon Perk 2) | Yes |
| Origin Trait | Yes |
| Masterwork | No |
| Intrinsic | No |
