# D3 DeDuper - Claude Code Context

## Project Overview

**D3 - Destiny DeDupe** is a Vue 3 + TypeScript application that simplifies duplicate weapon management in Destiny 2 inventory.

### Problem Statement
Players accumulate multiple copies of the same weapon with different perk combinations (rolls), leading to inventory management fatigue and uncertainty about which weapons to keep or dismantle.

### Solution
Provides a "merged" or "deduped" view showing all collected perk combinations for each weapon as if they were one unified weapon instance, making it easy to:
- Visually identify progress toward god rolls
- See which perk combinations you've earned
- Safely identify which duplicate weapons can be deleted

## Tech Stack

- **Framework**: Vue 3.5 with Composition API
- **Language**: TypeScript 5.7
- **State Management**: Pinia
- **Routing**: Vue Router
- **Styling**: Tailwind CSS
- **Build Tool**: Vite 6
- **API**: Bungie Destiny 2 API

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
- Click/Shift-click interaction for perk selection

**UX Features:**
- Perk tooltips (native `title` attribute) showing descriptions on hover
- Recent searches dropdown with localStorage persistence
- Sort toggle (Most Duplicates / A-Z) on weapons list

## Data Models

### Weapon Instance
Represents a single weapon copy with specific perks equipped:
- Barrel
- Magazine
- Left column traits
- Right column traits
- Origin traits
- Masterwork

### Deduped Weapon
Consolidated view showing all earned perk combinations across all instances of the same weapon.

## Architecture Patterns

### State Management
- **Pinia stores** for global state (auth, weapons, manifest)
- Stores handle API calls and data transformation
- Components consume reactive state from stores

### Service Layer
- Separation between API calls (`api/`) and business logic (`services/`)
- `weapon-parser.ts` - Transforms raw API data into domain models
- `deduplication.ts` - Merges weapon instances into consolidated views
- `manifest-service.ts` - Processes Destiny manifest definitions

### Component Organization
- Route-level views in `views/`
- Feature-specific components in `components/weapons/`
- Shared components in `components/common/`
- Layout components in `components/layout/`

## Routes

- `/` - Main weapons list (requires auth)
- `/about` - Landing page with login
- `/weapons/:weaponHash` - Weapon detail view (requires auth)
- `/playground/:weaponHash?` - Demo/prototype view
- `/callback` - OAuth callback handler

Unauthenticated users are redirected to `/about`.

## Development Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production (runs vue-tsc + vite build)
npm run preview    # Preview production build
npm test           # Run test suite (vitest)
npm run test:watch # Run tests in watch mode
```

## Testing

- **Framework**: Vitest
- **Test files**: `src/services/*.test.ts`
- **Coverage**: 83 tests across 3 service files (manifest-service, weapon-parser, deduplication)

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

## Future Enhancements (Stretch Goals)

From `idea.md`:
- Notifications when new perks are earned that weren't previously collected
- More granular god roll tracking (3 of 6, 4 of 6 completions)
- Enhanced wishlist features
