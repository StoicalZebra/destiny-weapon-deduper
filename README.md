# Destiny Weapon Deduper

A Vue 3 + TypeScript application that simplifies duplicate weapon management in Destiny 2 inventory.

## Overview

Players accumulate multiple copies of the same weapon with different perk combinations (rolls). This app provides a "merged" or "deduped" view showing all collected perk combinations for each weapon as if they were one unified weapon instance.

See [idea.md](idea.md) for the full project vision.

## Tech Stack

- **Framework**: Vue 3.5 with Composition API
- **Language**: TypeScript 5.7
- **State Management**: Pinia
- **Styling**: Tailwind CSS
- **Build Tool**: Vite 6
- **API**: Bungie Destiny 2 API

## Getting Started

### Prerequisites

- Node.js 18+
- Bungie API credentials (see below)

### Bungie API Setup

The app requires access to the Bungie Destiny 2 API for fetching weapon definitions and user inventory.

#### 1. Register Your Application

1. Go to [Bungie Application Portal](https://www.bungie.net/en/Application)
2. Sign in with your Bungie account
3. Click **Create New App**
4. Fill in the required fields:
   - **Application Name**: Your app name (e.g., "DeDuper Dev")
   - **Website**: Can be `http://localhost:5173` for local development
   - **Redirect URL**: `http://localhost:5173/callback`
   - **Origin Header**: `http://localhost:5173`
   - **OAuth Client Type**: Select "Confidential"
5. Accept the terms and create the application
6. Copy your **API Key** and **OAuth client_id**

#### 2. Configure Environment Variables

Copy the example environment file and add your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
VITE_BUNGIE_API_KEY=your_api_key_here
VITE_BUNGIE_CLIENT_ID=your_client_id_here
VITE_BUNGIE_REDIRECT_URI=http://localhost:5173/callback
```

**Important**: Never commit `.env.local` to version control. It's already in `.gitignore`.

### Installation

```bash
npm install
npm run dev
```

## Bungie Manifest

The Bungie Manifest contains all Destiny 2 game definitions (weapons, perks, stats, etc.). It's approximately 200MB+ and updated with each game patch.

### How the Main App Uses the Manifest

The main Vue app downloads the manifest **dynamically at runtime**:

1. On first load, fetches manifest metadata from Bungie API
2. Downloads required definition tables (weapons, perks, sockets, etc.)
3. Stores in browser **IndexedDB** (too large for localStorage)
4. Checks manifest version on subsequent loads, only re-downloads if changed

**Required Manifest Tables:**
- `DestinyInventoryItemDefinition` - Weapon/armor definitions
- `DestinyPlugSetDefinition` - Perk options per socket
- `DestinySocketCategoryDefinition` - Socket categories
- `DestinySocketTypeDefinition` - Socket type metadata
- `DestinyStatDefinition` - Weapon stat definitions
- `DestinySandboxPerkDefinition` - Perk trait definitions

### Manifest Storage Locations

| Component | Storage | Location |
|-----------|---------|----------|
| Main Vue App | IndexedDB | Browser storage (per user) |
| YouTube Agent | JSON files | `scripts/youtube-agent/*.json` |

---

## YouTube God Roll Agent

A Python script that extracts god roll recommendations from YouTube videos using AI.

Located in: `scripts/youtube-agent/`

### Setup

```bash
cd scripts/youtube-agent
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

### Environment Variables

Copy and configure:
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Required for video analysis
GEMINI_API_KEY=your_gemini_api_key_here

# Required for fetching weapon perk pools
BUNGIE_API_KEY=your_bungie_api_key_here
```

Get your API keys:
- **Gemini**: [Google AI Studio](https://aistudio.google.com/apikey)
- **Bungie**: [Bungie Application Portal](https://www.bungie.net/en/Application)

### Fetching Weapon Perk Pools

The YouTube agent uses a local cache of weapon perk pools to validate extracted perks. This prevents the AI from hallucinating perks that don't exist on a weapon.

#### Initial Setup / Updating

Run this script to download weapon perk pools from Bungie:

```bash
./venv/bin/python fetch_weapon_perks.py
```

This creates two files:
- `weapon_perk_pools.json` - Valid perks for each weapon (~1700 weapons)
- `perk_names.json` - Perk hash to name mapping (~12000 perks)

#### When to Update

Re-run `fetch_weapon_perks.py` when:
- A new Destiny 2 season launches (new weapons added)
- Mid-season weapon updates occur
- You encounter "unknown weapon" errors for new weapons

```bash
# Update perk pools after a new season
cd scripts/youtube-agent
./venv/bin/python fetch_weapon_perks.py
```

### Running the YouTube Agent

```bash
./venv/bin/python youtube_agent.py
```

Paste a YouTube URL when prompted. Supports:
- Single videos: `https://www.youtube.com/watch?v=...`
- Playlists: `https://www.youtube.com/playlist?list=...`

### How Two-Pass Validation Works

The agent uses a two-pass approach to ensure accurate perk extraction:

1. **Pass 1 - Weapon Extraction**: Identifies weapon names from the transcript
2. **Perk Pool Lookup**: Fetches valid perks for each weapon from local cache
3. **Pass 2 - Constrained Extraction**: Re-prompts AI with only valid perk options

This prevents hallucinated perks like "Opening Shot" appearing on weapons that can't roll it.

### Output Files

Generated in `scripts/youtube-agent/output/`:
- `God_Rolls_{timestamp}.json` - LittleLight wishlist format (importable)
- `God_Rolls_{timestamp}.md` - Human-readable markdown

---

## Development

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm test           # Run tests
npm run test:watch # Run tests in watch mode
```

## Project Structure

```
destiny_deduper/
├── src/                    # Main Vue application
│   ├── api/                # Bungie API integration
│   ├── components/         # Vue components
│   ├── services/           # Business logic
│   ├── stores/             # Pinia state management
│   └── views/              # Route views
├── scripts/
│   └── youtube-agent/      # YouTube god roll extractor
│       ├── youtube_agent.py
│       ├── fetch_weapon_perks.py
│       ├── weapon_perk_pools.json  # Generated - not in git
│       └── perk_names.json         # Generated - not in git
├── planning/               # Design docs and specs
└── data/                   # Static data files
```

## UI Styling Guide

The weapon detail view uses consistent styling patterns across the Perk Matrix and Inventory sections.

### Perk Matrix

Each perk is displayed as a rounded rectangle card with the following states:

| State | Background | Border | Icon Ring |
|-------|-----------|--------|-----------|
| **Owned (default)** | `bg-gray-800` | `border-gray-700` | `ring-1 ring-white/80` |
| **Not owned** | `bg-gray-800/30` | `border-gray-700/50` | `ring-1 ring-gray-700 opacity-40` |
| **Hovered** | `bg-gray-700` | `border-orange-400 ring-1 ring-orange-400` | `ring-2 ring-orange-400` |
| **Instance highlighted** | `bg-gray-700/50` | `border-orange-400/50` | — |
| **Dimmed (other instance hovered)** | `bg-gray-800` | `border-gray-700 opacity-40` | — |

### Inventory Cards

Each weapon instance card follows the same pattern:

| State | Classes |
|-------|---------|
| **Default** | `bg-gray-800 border-gray-700` |
| **Hovered** | `bg-gray-700 border-orange-400 ring-1 ring-orange-400` |
| **Perk highlighted** | `bg-gray-700/50 border-orange-400/50` |
| **Dimmed** | `opacity-50` |

### Wishlist Indicators

- **Thumbs-up badge**: Green circle (`bg-green-600`) positioned at `-top-1 -right-1` on perk icons
- Appears on perks recommended by enabled wishlists

### Source Type Badges

Pill-shaped badges indicating wishlist source (consistent across all views):

| Type | Classes |
|------|---------|
| **Preset** | `bg-green-900/50 text-green-300 border border-green-700/50 rounded-full` |
| **Custom** | `bg-blue-900/50 text-blue-300 border border-blue-700/50 rounded-full` |

Used in:
- `WishlistCard.vue` - Full size (`px-2 py-0.5 text-xs`)
- `WishlistsApplied.vue` - Compact size (`px-1.5 py-0.5 text-[9px]`)

### Color System

- **Base backgrounds**: `gray-800` (darker), `gray-700` (lighter/hover)
- **Accent color**: `orange-400` for hover states and highlights
- **Dimming**: `opacity-40` or `opacity-50` for non-focused elements
- **Wishlist badge**: `green-600`

---

## Security Notes

**Never commit these files:**
- `.env.local` - Main app credentials
- `scripts/youtube-agent/.env` - YouTube agent credentials
- `scripts/youtube-agent/weapon_perk_pools.json` - Generated data
- `scripts/youtube-agent/perk_names.json` - Generated data

All are listed in `.gitignore`.

---

## Wishlist Performance Architecture

The wishlist system handles large datasets (Voltron wishlists contain 100k+ items). Several optimizations ensure responsive UI when toggling wishlists on/off:

### Storage Strategy

| Data | Storage | Reason |
|------|---------|--------|
| Preset wishlists (full data) | IndexedDB | Large files (~10MB for Voltron) |
| User wishlists (<1000 items) | localStorage | Fast synchronous access |
| User wishlists (≥1000 items) | IndexedDB | Avoid localStorage limits |
| Enabled states | localStorage | Lightweight, instant toggle |

### Optimizations Applied

1. **Separate enabled state storage** (`wishlist-storage-service.ts`)
   - Enabled/disabled states stored separately in localStorage
   - Toggling a wishlist writes ~50 bytes instead of 10MB
   - Key: `d3_wishlist_enabled_states`

2. **Separate reactive Map** (`stores/wishlists.ts`)
   - `enabledStates` is a separate `ref<Map>` from wishlist objects
   - Toggling doesn't trigger Vue reactivity on `allWishlists` computed
   - Prevents cascading re-renders of components watching wishlist data

3. **Pre-built weapon indexes** (`stores/wishlists.ts`)
   - `weaponIndexes`: `Map<wishlistId, Map<weaponHash, WishlistItem[]>>`
   - Built once on initialization, provides O(1) lookups
   - `getItemsForWeaponHash()` no longer scans 100k+ items per toggle

### Key Files

- `src/stores/wishlists.ts` - State management with `enabledStates` and `weaponIndexes`
- `src/services/wishlist-storage-service.ts` - `getEnabledStates()`, `setEnabledState()`
- `src/components/weapons/WishlistsApplied.vue` - Toggle UI component

---

## Wishlist Format: DIM vs Little Light JSON

This app uses **DIM's `.txt` format** for wishlist storage. Here's why:

### Format Comparison

**DIM Format (`.txt`)** — One line per exact perk combination:
```
dimwishlist:item=2819552809&perks=1147230557,2126519017,1926441324,2541826827
dimwishlist:item=2819552809&perks=1147230557,4273542183,1926441324,2541826827
dimwishlist:item=2819552809&perks=2860123632,2126519017,1926441324,2541826827
// ...9 lines for a 3×3×1×1 roll
```

**Little Light JSON** — One object per roll with arrays of acceptable perks:
```json
{
  "hash": 2819552809,
  "plugs": [
    [1147230557, 2860123632, 111235976],  // Column 1: ANY of these
    [2126519017, 4273542183, 3210123846], // Column 2: ANY of these
    [1926441324],
    [2541826827]
  ]
}
// 1 object for the same 3×3×1×1 roll
```

### Comparison

| Aspect | DIM `.txt` | Little Light JSON |
|--------|------------|-------------------|
| **Lines per roll** | Exponential (3×3×1×1 = 9 lines) | Linear (1 object) |
| **Metadata** | Comments (`//notes:`, `//tags:`) | First-class fields |
| **DIM compatibility** | Native | Requires conversion |
| **Community standard** | Yes (Voltron, etc.) | No |
| **Human readable** | Somewhat | Yes |

### Why We Chose DIM Format

1. **DIM is the ecosystem standard** — All major community wishlists (Voltron, Pandapaxxy, etc.) use DIM format
2. **No conversion needed** — Import and export work directly with DIM
3. **The "extra lines" cost is invisible** — Users don't see the file, they just see "roll matches" or not
4. **Storage is cheap** — Even Voltron's 240K lines is only ~10MB

The only scenario where JSON pays off is building a standalone wishlist editor where DIM compatibility is secondary. Since our primary use case is DIM integration, storing in DIM format avoids conversion overhead on both import and export.

### Little Light Import/Export

**Important:** Little Light only supports **JSON import** and **TXT export**. It cannot import DIM `.txt` files directly.

| Direction | Format | Notes |
|-----------|--------|-------|
| **Import into Little Light** | `.json` | Must use Little Light JSON schema |
| **Export from Little Light** | `.txt` | DIM-compatible format |

**Workflow for Little Light users:**
1. Create wishlist in DIM `.txt` format (or use YouTube agent output)
2. Convert to Little Light JSON format (manually or with a script)
3. Import `.json` into Little Light app
4. Little Light can export back to `.txt` if needed

**Little Light JSON Schema:**
```json
{
  "name": "Wishlist Name",
  "description": "Description",
  "data": [
    {
      "hash": 2819552809,
      "name": "Roll name (optional)",
      "description": "Notes about this roll",
      "plugs": [
        [hash1, hash2],       // Barrel/Frame options
        [hash1],              // Magazine/Battery options
        [hash1, hash2, hash3], // Perk column 1 options
        [hash1, hash2]        // Perk column 2 options
      ],
      "tags": ["GodPVE", "PVP"]  // PVE, GodPVE, PVP, GodPVP
    }
  ]
}
```

Reference: [LittleLight Wishlists GitHub](https://github.com/LittleLightForDestiny/littlelight_wishlists)

---

## Wishlist Types & Permissions

| Type | Can Edit | Card Buttons | Notes |
|------|----------|--------------|-------|
| **Regular Presets** (Voltron, etc.) | No | View on GitHub, Update | Read-only for all users |
| **Admin-Editable Preset** (StoicalZebra) | Yes (admin only) | Edit, View on GitHub, Export | Editable by configured admin user |
| **Custom/User Wishlists** | Yes | View, Export, Delete | User-created, stored locally |

### Design Philosophy

Users can create and edit their own custom wishlists - no need for external tools like LittleLight.

What we intentionally removed:
- **Fork/copy preset wishlists** - Voltron has 240K+ items; forking creates massive local copies
- **In-app viewing of preset contents** - Rendering 240K items crashed browsers

If you want to see what's in a preset like Voltron, click "View on GitHub" to see the raw file. If you want your own wishlist, create a custom one from scratch or import a DIM-format file.

This matches DIM's model: presets are "subscribe and use" not "fork and customize."

### Admin Wishlist Editing (StoicalZebra)

The StoicalZebra preset wishlist is admin-editable, allowing in-app editing with a manual sync workflow.

### Storage Locations

| Location | Purpose |
|----------|---------|
| `data/wishlists/StoicalZebra-wishlist.txt` | **Source of truth** - the file in Git that others link to |
| Browser localStorage | **Working copy** - where in-app edits are saved temporarily |
| GitHub raw URL | **Public share link** - what DIM users import |

### Update Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Edit in App    │ ──► │  Click Export   │ ──► │ Download .txt   │
│  (localStorage) │     │                 │     │ (to Downloads)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Push to GitHub │ ◄── │ Copy/move file  │ ◄── │ Replace old     │
│                 │     │ to data/        │     │ .txt in repo    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Steps to Update

1. **Edit in app** → Navigate to Wishlists, click "Edit" on StoicalZebra preset
2. **Export** → Click "Export" button, downloads `StoicalZebra.txt` to `~/Downloads/`
3. **Replace file** → Copy downloaded file to `data/wishlists/StoicalZebra-wishlist.txt`
4. **Commit & push** → Updates the GitHub raw URL for everyone

**Note:** Browsers cannot write directly to the filesystem for security reasons, hence the manual copy step.

---

## DIM Integration

This app can generate search strings to help you find specific weapons in DIM (Destiny Item Manager).

### Current Feature: Copy to DIM

Each weapon instance has a "Copy to DIM" button that copies the item's instance ID. Paste into DIM's search bar to highlight that specific weapon.

**Workflow:**
1. Identify duplicates in Destiny Deduper
2. Click copy button on instances you want to tag
3. Paste into DIM search bar
4. Right-click → Tag → Keep or Junk
5. Repeat for other instances
6. In DIM, filter `is:junk` → unlock → move to character
7. Dismantle in-game

### Future: Direct DIM Sync (Planned)

Direct integration with DIM's API to set Keep/Junk tags without leaving this app. This would enable:
- Click "Keep" or "Junk" directly in Destiny Deduper
- Tags sync automatically to DIM
- No copy-paste needed

Requires obtaining a DIM API key (contact DIM team on Discord).

### Other Integration Options Researched

| Feature | Status | Notes |
|---------|--------|-------|
| **Bungie Lock/Unlock API** | Possible | Requires `MoveEquipDestinyItems` OAuth scope |
| **DIM Loadout Shares** | Not ideal | Designed for armor builds, not duplicate management |
| **DIM Tag API** | Planned | Best option for full Keep/Junk workflow |

---

## Theme Mode Detection (for Browser Testing)

When testing with Playwright MCP or taking screenshots, always verify the current theme mode programmatically before making visual assertions.

### Programmatic Detection

```javascript
// Check current theme mode
const isDark = document.documentElement.classList.contains('dark');
const mode = isDark ? 'DARK' : 'LIGHT';

// Full check with background color verification
const html = document.documentElement;
const bgColor = window.getComputedStyle(document.body).backgroundColor;
// Light mode: rgb(248, 250, 252) - slate-50
// Dark mode: rgb(15, 23, 42) - slate-900
```

### Visual Markers by Theme

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| **Page background** | Light gray (`slate-50`) | Dark blue-gray (`slate-900`) |
| **Header/nav** | Light with dark text | Dark with light text |
| **Theme toggle icon** | Sun icon (☀️) | Moon icon (🌙) |
| **Card backgrounds** | White/light gray | Dark gray (`slate-800`) |
| **Text color** | Dark (`slate-900`) | Light (`slate-100`) |
| **Perk icon circles** | Dark (`slate-800`) - **same in both modes** | Dark (`slate-800`) |

### Why Perk Icons Use Dark Backgrounds in Both Modes

Bungie's perk icons are designed for dark backgrounds. The icon images have transparent backgrounds with colored/white foreground elements. Using `bg-slate-800` ensures proper contrast and visibility regardless of the page theme.

**Correct:** `bg-slate-800` (dark background, both modes)
**Incorrect:** `bg-slate-200 dark:bg-slate-800` (light background in light mode breaks icon visibility)

### Playwright MCP Verification Pattern

Always verify theme before taking screenshots:

```javascript
// In Playwright MCP browser_evaluate:
() => ({
  mode: document.documentElement.classList.contains('dark') ? 'DARK' : 'LIGHT'
})
```

Then take screenshot with descriptive filename:
- `VERIFIED-LIGHT-MODE-feature.png`
- `VERIFIED-DARK-MODE-feature.png`

---

## Enhanced Perks: Manifest Detection Guide

This section documents how to identify enhanced vs base perks in the Bungie Destiny 2 manifest. This knowledge is essential for the Enhanced Perks feature debugging.

### Key Discovery

**Modern Destiny 2 perks do NOT have "Enhanced" in their display name.** Both base and enhanced variants share the same `displayProperties.name` (e.g., both are "Rapid Hit"). They are differentiated by other manifest fields.

### How to Identify Enhanced Perks

| Field | Base Perk | Enhanced Perk |
|-------|-----------|---------------|
| `itemTypeDisplayName` | `"Trait"` | `"Enhanced Trait"` |
| `tierType` | `2` (Common) | `3` (Uncommon) |
| `displayProperties.name` | `"Rapid Hit"` | `"Rapid Hit"` (same!) |

**Primary detection method:** Check `itemTypeDisplayName === "Enhanced Trait"`

### Example: Aisha's Embrace Right Trait Perks

The Right Trait plug set (hash `1580292161`) contains both base and enhanced variants:

| Perk Name | Base Hash | Enhanced Hash |
|-----------|-----------|---------------|
| Rapid Hit | 247725512 | 2938480696 |
| Dragonfly | 2848615171 | 1600202343 |
| Explosive Payload | 3038247973 | 1824513213 |

### Implementation

The detection logic lives in [deduplication.ts](src/services/deduplication.ts):

```typescript
export function isEnhancedPerk(hash: number): boolean {
  const perkDef = manifestService.getInventoryItem(hash)
  if (!perkDef) return false

  // Check itemTypeDisplayName first (most reliable)
  const itemTypeDisplayName = perkDef.itemTypeDisplayName?.toLowerCase() || ''
  if (itemTypeDisplayName === 'enhanced trait') return true

  // Fallback: check name for legacy perks that might have "Enhanced" prefix
  const name = perkDef.displayProperties?.name || ''
  if (isEnhancedPerkName(name)) return true

  return false
}
```

### Debugging Tips

1. **Query IndexedDB directly**: Open DevTools → Application → IndexedDB → `d3deduper` → `manifest`
   - Look up perk definitions by hash
   - Check `itemTypeDisplayName` and `tierType` fields

2. **Find plug set hashes**: Weapon definitions contain `sockets.socketEntries[].randomizedPlugSetHash` which points to the plug set containing all possible perks for that column

3. **Verify perk grouping**: Perks are grouped by normalized name (lowercase). Each group should have exactly 2 variants if enhanced exists (base + enhanced)

4. **Console logging**: Add temporary logging in `buildPerkColumn()` to see all perks and their enhanced status

### Historical Context

Prior to ~2023, some enhanced perks DID have "Enhanced" in their name (e.g., "Enhanced Rapid Hit"). The `isEnhancedPerkName()` helper handles these legacy cases. Modern perks require the `isEnhancedPerk()` check using `itemTypeDisplayName`.

---

## TODO / Future Improvements

- [ ] **Wishlist toggle performance**: Toggle response is ~200-300ms. Goal is instant (<50ms). All obvious optimizations applied; further profiling needed to identify remaining bottleneck.
- [ ] **DIM API Integration**: Implement direct Keep/Junk tagging via DIM's API
