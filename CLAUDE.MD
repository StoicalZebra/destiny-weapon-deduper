# Destiny Weapon Deduper - Claude Code Context

> **This file is for AI/developer context when working in the codebase.**
> - For setup instructions and feature docs, see [README.md](README.md)
> - For deep technical internals, see [planning/Architecture.md](planning/Architecture.md)

## Project Overview

**Destiny Weapon Deduper** - Vue 3 + TypeScript app for managing duplicate Destiny 2 weapons. Shows a "merged" view of all perk combinations across weapon copies, helping users identify god rolls and safely dismantle duplicates.

**Tech Stack**: Vue 3.5, TypeScript 5.7, Pinia, Tailwind CSS, Vite 6, Bungie API

## Project Structure

```
src/
├── api/              # API integration layer
│   ├── auth.ts       # Bungie OAuth authentication
│   ├── inventory.ts  # Inventory fetching
│   ├── manifest.ts   # Destiny manifest data
│   └── types.ts      # API type definitions
├── stores/           # Pinia state management
│   ├── auth.ts       # Authentication state
│   ├── manifest.ts   # Destiny manifest data
│   └── weapons.ts    # Weapons inventory state
├── services/         # Business logic layer
│   ├── manifest-service.ts  # Manifest data processing
│   ├── weapon-parser.ts     # Parse weapon instances
│   └── deduplication.ts     # Weapon deduplication logic
├── models/           # TypeScript data models
│   ├── weapon-instance.ts   # Individual weapon instance
│   ├── deduped-weapon.ts    # Merged weapon view
│   └── perk.ts              # Perk trait definitions
├── components/       # Vue components
│   ├── auth/         # Authentication UI
│   ├── common/       # Reusable components
│   ├── layout/       # App layout components
│   ├── playground/   # Prototype components
│   └── weapons/      # Weapon display components
├── views/            # Route views
│   ├── HomeView.vue
│   ├── WeaponsView.vue
│   ├── WeaponDetailView.vue
│   ├── CallbackView.vue
│   └── PlaygroundView.vue
└── utils/            # Utility functions
    ├── storage.ts    # Local storage helpers
    └── constants.ts  # App constants
```

## Key Features Implemented

### Core Functionality
1. **OAuth Authentication** - Bungie.net OAuth flow for secure API access
2. **Inventory Fetching** - Retrieves user's complete Destiny 2 weapon inventory
3. **Weapon Deduplication** - Merges duplicate weapons into consolidated views
4. **Matrix Visualization** - "Punch-card" style display showing all earned perk combinations per weapon
5. **God Roll Tracking** - Manual wishlist/checklist for desired perk combinations
6. **Instance List** - Shows individual weapon copies that contribute to the merged view

### UI Components

**Weapon Display:**
- `WeaponMatrix.vue` - Main punch-card matrix showing all perk possibilities
- `WeaponCard.vue` - Individual weapon card display
- `WeaponCompactCard.vue` - Condensed weapon display
- `WeaponList.vue` - List of all weapons
- `PerkCell.vue` - Individual perk cell in the matrix
- `PerkColumn.vue` - Column of perks in the matrix
- `InstanceList.vue` - Shows individual weapon copies

**God Roll Features:**
- `WeaponsGodRoll.vue` - God roll selection interface
- `WeaponsCoverage.vue` - Coverage/completion tracking
- Single-button save with smart state detection
- Click to toggle perk selection (selected perks highlighted in orange)

**Wishlist Matching Logic:**
- Uses **OR logic within columns**: If you select multiple perks in the same column (e.g., Perk A, B, C), an instance matches if it has ANY of those perks
- Uses **AND logic between columns**: An instance must have at least one matching perk in EVERY column that has selections
- Example: If you select "Delicate Tuning" and "Pugilist" in Column 1, plus "Precision Instrument" in Column 2, an instance matches if it has (Delicate Tuning OR Pugilist) AND (Precision Instrument)

**UX Features:**
- Perk tooltips (native `title` attribute) showing descriptions on hover
- Recent searches dropdown with localStorage persistence
- Sort toggle (Most Duplicates / A-Z) on weapons list

## Architecture Overview

For detailed data models, data flow diagrams, and storage architecture, see [planning/Architecture.md](planning/Architecture.md).

**Key patterns:**
- **Pinia stores** for global state (auth, weapons, manifest, wishlists)
- **Service layer** separates API calls (`api/`) from business logic (`services/`)
- **Component organization**: views in `views/`, features in `components/weapons/`, shared in `components/common/`

## Routes

- `/` - Main weapons list (requires auth)
- `/about` - Landing page with login
- `/weapons/:weaponHash` - Weapon detail view (requires auth)
- `/playground/:weaponHash?` - Demo/prototype view
- `/callback` - OAuth callback handler

Unauthenticated users are redirected to `/about`.

## Testing

- **Framework**: Vitest
- **Test files**: `src/services/*.test.ts`
- **Run**: `npm test` or `npm run test:watch`

## Important Notes for Claude

### When Working on This Project:
1. **Preserve existing patterns** - Follow the established separation between API, services, stores, and components
2. **God roll features** - The god roll system uses smart state detection and single-button saves (see recent commits)
3. **TypeScript** - Project uses strict TypeScript; maintain type safety
4. **Destiny 2 API** - Be mindful of API structure and manifest definitions when modifying data models
5. **UI Style** - Matrix visualization is core to the UX (punch-card style similar to d2foundry.gg)

### Key Files to Reference:
- `idea.md` - Original project vision and requirements
- `src/services/deduplication.ts` - Core deduplication logic
- `src/components/weapons/WeaponMatrix.vue` - Main visualization component
- `src/stores/weapons.ts` - Central weapons state management

### Don't:
- Break the deduplication logic without careful consideration
- Change the matrix visualization paradigm without discussion
- Modify API integration without understanding Bungie API contracts
- Add unnecessary dependencies
- Commit and push without running `npm test` first and ensuring all tests pass

## Gotchas / Common Pitfalls

### Weapon Variant Grouping

The codebase has two different approaches for grouping weapon variants:

**1. `manifestService.getWeaponVariantHashes()` - Season/Watermark Based**
- Groups weapons by **name + season/watermark**
- Used for: Inventory deduplication (same weapon from same season)
- Limitation: **Does NOT catch all variants** - event weapons (e.g., Dawning holofoils) have different watermarks than their normal versions, so they won't be grouped together

**2. `groupItemsByWeaponName()` in `wishlist-consolidation.ts` - Name Based**
- Groups weapons by **name only** (regardless of season or watermark)
- Used for: UI consolidation where you want ALL versions of "Permafrost" grouped together
- Benefit: Catches all variants including event holofoils, seasonal re-releases, etc.

**When to use which:**
| Use Case | Function | Why |
|----------|----------|-----|
| Inventory ownership (what do I have?) | `getWeaponVariantHashes()` | Distinguishes seasonal versions |
| UI display consolidation (show one card) | `groupItemsByWeaponName()` | Groups ALL versions of a weapon |

### DIM Wishlist Tags

DIM ignores `|tags:` in wishlist files but we parse and display them in our UI. When exporting, tags are embedded in the notes field for round-trip compatibility.

## Related Documentation

- [README.md](README.md) - Setup, commands, feature docs, wishlist format specs
- [planning/Architecture.md](planning/Architecture.md) - Bungie API internals, data flow, storage schemas
- [planning/Spec.md](planning/Spec.md) - Product roadmap and future enhancements
- [planning/UI-Styling.md](planning/UI-Styling.md) - UI color scheme and styling constants
