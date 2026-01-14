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

## TODO / Future Improvements

- [ ] **Wishlist toggle performance**: Toggle response is ~200-300ms. Goal is instant (<50ms). All obvious optimizations applied; further profiling needed to identify remaining bottleneck.
- [ ] **DIM API Integration**: Implement direct Keep/Junk tagging via DIM's API
