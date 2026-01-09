Copy of Claude's plan posted here so Codex could see it

# D3 Deduper - Implementation Plan

## Overview
Build a Destiny 2 weapon deduplication app that shows a consolidated "punch-card" matrix view of all perk combinations earned across duplicate weapons.

## Tech Stack
- **Frontend**: Vue 3 + Composition API
- **Build**: Vite + TypeScript
- **State**: Pinia
- **Routing**: Vue Router 4
- **Styling**: Tailwind CSS
- **Deployment**: Vercel/Netlify (static hosting)
- **Architecture**: Client-side only (no backend)

## Core Value Proposition
- Visual status of god roll progress for each weapon
- Know when god roll is complete
- Safely identify which duplicate weapons can be dismantled

## Critical Implementation Steps

### 1. Project Setup
**Files to create:**
- `package.json` - Dependencies (Vue 3, Vite, TypeScript, Pinia, Vue Router, Tailwind)
- `vite.config.ts` - Vite configuration with path aliases
- `tsconfig.json` - TypeScript configuration
- `.env.example` - Environment variable template
- `.env.local` - Local environment variables (Bungie API key, client ID, redirect URI)

### 2. Bungie API Authentication (CRITICAL PATH)
**File:** `src/api/auth.ts`

Implement OAuth flow for Bungie's "public client" authentication:
- `initiateLogin()` - Redirect to Bungie OAuth with state parameter (CSRF protection)
- `handleCallback()` - Exchange authorization code for access token
- Store tokens in localStorage
- **Key constraint**: No refresh tokens for public clients → users re-authenticate after 1 hour

**Files:**
- `src/stores/auth.ts` - Auth state (tokens, user, isAuthenticated)
- `src/views/CallbackView.vue` - OAuth callback handler
- `src/components/auth/LoginButton.vue` - Login trigger

### 3. Manifest Integration (CRITICAL PATH)
**File:** `src/api/manifest.ts`

Download and cache Bungie's manifest (weapon/perk definitions):
- Fetch manifest info from `https://www.bungie.net/Platform/Destiny2/Manifest/`
- Download only needed definitions:
  - `DestinyInventoryItemDefinition` (weapons)
  - `DestinySandboxPerkDefinition` (perks)
  - `DestinyPlugSetDefinition` (perk sets)
  - `DestinyStatDefinition` (stats)
- Store in IndexedDB (too large for localStorage ~200MB compressed)
- Check manifest version on load, only re-download if changed

**Files:**
- `src/services/manifest-service.ts` - Manifest lookup/parsing
- `src/stores/manifest.ts` - Manifest cache state
- `src/utils/storage.ts` - IndexedDB helpers

### 4. Fetch User Inventory
**File:** `src/api/inventory.ts`

Fetch user's weapons with required components:
```typescript
GET /Platform/Destiny2/{type}/Profile/{id}/?components=102,201,205,300,302,304,305
```

**Critical components:**
- 305 (ItemSockets) - Contains all perk data
- 201 (CharacterInventories) - Character inventories
- 205 (CharacterEquipment) - Equipped items
- 102 (ProfileInventories) - Vault items

Filter for legendary weapons (tierType = 5) in weapon buckets.

**Files:**
- `src/services/weapon-parser.ts` - Parse API response to weapon instances
- `src/stores/inventory.ts` - Raw inventory data

### 5. Deduplication Algorithm (CORE LOGIC)
**File:** `src/services/deduplication.ts`

Transform weapon instances into merged "deduped" views:

1. **Group** weapons by itemHash
2. **Build perk matrix** from weapon definition:
   - Extract socket entries for perk columns (barrel, magazine, trait 1, trait 2, origin, masterwork)
   - Get available perks from `reusablePlugSetHash` and `randomizedPlugSetHash`
3. **Mark owned perks** by checking each instance's equipped plugs
4. **Calculate completion** (owned perks / total possible perks)

**Data models:**
- `src/models/weapon-instance.ts` - Individual weapon drop
- `src/models/deduped-weapon.ts` - Merged weapon view with perk matrix
- `src/models/perk.ts` - Perk definition

### 6. UI Components (Punch-Card Matrix)
**Component hierarchy:**
```
WeaponsView.vue
├── WeaponList.vue (searchable/filterable list)
│   └── WeaponCard.vue (per weapon)
│       └── WeaponMatrix.vue (punch-card visualization)
│           └── PerkColumn.vue (barrel, magazine, trait1, trait2, origin, masterwork)
│               └── PerkCell.vue (individual perk, owned vs not-owned styling)
└── InstanceList.vue (contributing weapon instances)
```

**Key styling:**
- Owned perks: Full opacity, green border/highlight
- Unowned perks: Low opacity (0.4), greyed out
- Reference d2foundry.gg for visual style

**Files:**
- `src/components/weapons/WeaponMatrix.vue` - Main matrix component
- `src/components/weapons/PerkColumn.vue` - Column component
- `src/components/weapons/PerkCell.vue` - Cell with perk icon/name
- `src/components/weapons/InstanceList.vue` - List of contributing instances

### 7. State Management
**Pinia stores:**
- `src/stores/auth.ts` - Authentication state
- `src/stores/manifest.ts` - Cached manifest data
- `src/stores/inventory.ts` - Raw inventory data
- `src/stores/weapons.ts` - Processed/deduped weapons

**Composables:**
- `src/composables/useAuth.ts` - Auth helpers
- `src/composables/useManifest.ts` - Manifest access
- `src/composables/useWeaponData.ts` - Weapon data access

### 8. Routing
**Routes:**
- `/` - Home/landing page
- `/weapons` - Main weapons view (requires auth)
- `/callback` - OAuth callback handler

**File:** `src/router/index.ts`

### 9. Deployment
**Vercel deployment:**
1. Connect GitHub repo
2. Set environment variables:
   - `VITE_BUNGIE_API_KEY`
   - `VITE_BUNGIE_CLIENT_ID`
   - `VITE_BUNGIE_REDIRECT_URI` (production URL)
3. Build command: `npm run build`
4. Output directory: `dist`
5. Configure `vercel.json` for SPA routing

**Update Bungie app settings** with production redirect URI.

## Project Structure
```
d3deduper/
├── src/
│   ├── api/                      # Bungie API client
│   │   ├── auth.ts               # OAuth flow
│   │   ├── manifest.ts           # Manifest download
│   │   ├── inventory.ts          # Inventory fetch
│   │   └── bungie-client.ts      # Base HTTP client
│   ├── services/                 # Business logic
│   │   ├── deduplication.ts      # Core algorithm
│   │   ├── manifest-service.ts   # Manifest parsing
│   │   └── weapon-parser.ts      # API data parsing
│   ├── stores/                   # Pinia stores
│   │   ├── auth.ts
│   │   ├── manifest.ts
│   │   ├── inventory.ts
│   │   └── weapons.ts
│   ├── models/                   # Data models
│   │   ├── weapon-instance.ts
│   │   ├── deduped-weapon.ts
│   │   └── perk.ts
│   ├── components/               # Vue components
│   │   ├── auth/
│   │   │   └── LoginButton.vue
│   │   ├── weapons/
│   │   │   ├── WeaponList.vue
│   │   │   ├── WeaponCard.vue
│   │   │   ├── WeaponMatrix.vue
│   │   │   ├── PerkColumn.vue
│   │   │   ├── PerkCell.vue
│   │   │   └── InstanceList.vue
│   │   └── layout/
│   │       ├── AppHeader.vue
│   │       └── AppFooter.vue
│   ├── views/                    # Page components
│   │   ├── HomeView.vue
│   │   ├── WeaponsView.vue
│   │   └── CallbackView.vue
│   ├── router/
│   │   └── index.ts
│   ├── composables/
│   ├── utils/
│   ├── App.vue
│   └── main.ts
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── vercel.json
```

## Development Phases

### Phase 1: Setup + Auth (Priority: HIGHEST)
- Initialize Vite + Vue 3 + TypeScript
- Register app with Bungie Developer Portal
- Implement OAuth flow (`auth.ts`, auth store, callback view)
- Test: User can log in and see Bungie username

### Phase 2: Manifest (Priority: HIGHEST)
- Implement manifest service (download, cache, lookup)
- Set up IndexedDB storage
- Version checking
- Test: Can lookup weapon/perk definitions

### Phase 3: Inventory (Priority: HIGH)
- Create inventory service
- Fetch profile with correct components
- Parse weapon instances
- Test: Can retrieve user's legendary weapons

### Phase 4: Deduplication (Priority: HIGH)
- Implement grouping by weapon hash
- Build perk matrix from definitions
- Mark owned perks from instances
- Calculate completion percentage
- Test: Algorithm produces correct merged views

### Phase 5: UI (Priority: MEDIUM)
- Build component hierarchy
- Implement WeaponMatrix punch-card visualization
- Add search/filter
- Styling (owned vs unowned perks)
- Test: Visual matrix displays correctly

### Phase 6: Polish (Priority: MEDIUM)
- Optimize manifest loading
- Add loading states
- Error handling
- Mobile responsive
- Performance testing

### Phase 7: Deploy (Priority: LOW)
- Set up Vercel
- Configure environment
- Deploy to production
- Test production build

## Key Technical Challenges

### 1. OAuth Token Expiration
**Problem:** Public clients don't get refresh tokens (1-hour expiration)
**Solution:** Detect expiration, prompt re-authentication, clear messaging

### 2. Manifest Size
**Problem:** 200MB+ data to download
**Solution:** IndexedDB storage, check version before re-downloading, lazy load if needed

### 3. Complex API Data
**Problem:** Nested hashes, cross-references between definitions
**Solution:** TypeScript for type safety, extensive logging during development

### 4. Socket/Perk Parsing
**Problem:** Multiple socket types (fixed, random, reusable, randomized)
**Solution:** Handle all socket types in perk extraction, test with various weapon types

### 5. Performance
**Problem:** Hundreds of weapons, thousands of perks to render
**Solution:** Virtual scrolling, pagination, optimize rendering

## Critical Files to Create First
1. `src/api/auth.ts` - Authentication is foundational
2. `src/api/manifest.ts` - Required to translate hashes
3. `src/services/deduplication.ts` - Core business logic
4. `src/components/weapons/WeaponMatrix.vue` - Main UI component
5. `src/stores/weapons.ts` - Central state management

## Reference Resources
- Bungie API Docs: https://bungie-net.github.io/
- D2 Foundry (reference): https://d2foundry.gg/ & https://github.com/d2foundry/foundry
- OAuth Guide: https://github.com/Bungie-net/api/wiki/OAuth-Documentation
- Manifest Guide: https://github.com/Bungie-net/api/wiki/Obtaining-Destiny-Definitions-%22The-Manifest%22

## Success Criteria
- User can authenticate with Bungie account
- User can see all their legendary weapons
- Each weapon shows a punch-card matrix of owned/unowned perks
- User can identify which duplicate weapons are safe to delete
- App is deployed and accessible via public URL
