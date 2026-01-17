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

For detailed architecture (version checking, caching layers, data flow), see [planning/Architecture.md](planning/Architecture.md).

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

The weapon detail view uses a consistent **blue-centric color language** across both Wishlist Editor and Coverage Analysis modes.

### Centralized Style Constants

All UI state styling is defined in a single source of truth: **`src/styles/ui-states.ts`**

This prevents style drift between modes and makes theme changes easy. Import from this file instead of hardcoding Tailwind classes:

```typescript
import {
  INSTANCE_CARD_STYLES,  // base, match, dimmed, hovered
  PERK_RING_STYLES,      // default, selected, hovered, owned, unowned
  PERK_ROW_STYLES,       // base, selected, hovered, highlighted
  BADGE_STYLES,          // success, warning, info, error
  INDICATOR_STYLES,      // wishlist (icon badges)
  BUTTON_STYLES,         // primary, success, warning, danger, ghost
  INSTANCE_PALETTE,      // colors for coverage visualization
} from '@/styles/ui-states'
```

**Key files using centralized styles:**
- `WeaponDetailUnified.vue` - All instance card and perk styling
- `PerkIcon.vue` - Ring variant styling
- `InstancePerkGrid.vue` - Wishlist indicator badges

### Color Scheme Philosophy

The UI uses only **3 primary perk states** for clarity:

| State | Meaning | Color |
|-------|---------|-------|
| **Unowned** | Perk not available on any owned instance | Gray/faded |
| **Owned** | Perk available on at least one instance | White ring |
| **Selected/Active** | User-selected or hover-highlighted | Blue |

### Perk Matrix States

Each perk is displayed as a rounded rectangle card. Use `PERK_ROW_STYLES` and `PERK_RING_STYLES`:

| State | Constant | Visual |
|-------|----------|--------|
| **Owned (default)** | `PERK_ROW_STYLES.ownedHover` | Light bg, white ring |
| **Unowned** | `PERK_ROW_STYLES.unowned` | Faded bg, gray ring |
| **Hovered** | `PERK_ROW_STYLES.hovered` | Blue border highlight |
| **Selected** | `PERK_ROW_STYLES.selected` | Dark blue bg, blue ring |

### Inventory Card States

Instance cards use `INSTANCE_CARD_STYLES`:

| State | Constant | Visual |
|-------|----------|--------|
| **Default** | `INSTANCE_CARD_STYLES.base` | Elevated surface |
| **Hovered** | `INSTANCE_CARD_STYLES.hovered` | Light blue highlight |
| **Match** | `INSTANCE_CARD_STYLES.match` | Dark blue bg, blue ring |
| **Non-match** | `INSTANCE_CARD_STYLES.dimmed` | Grayed out |
| **DIM selected** | `INSTANCE_CARD_STYLES.dimSelected` | Blue selection ring |

### Instance Sorting

Inventory cards sort dynamically based on context:

| Context | Sort Order |
|---------|------------|
| **Default** | Numerically by instance ID |
| **Wishlist mode + perks selected** | Matches first, then by ID |
| **Coverage mode + perk hovered** | Instances with perk first, then by ID |

Instance labels show `#XXXX` (last 4 digits of instance ID) with tooltip for full ID.

### Special Indicators

Use `INDICATOR_STYLES` for icon badges:

| Indicator | Constant | Usage |
|-----------|----------|-------|
| **Wishlist thumbs-up** | `INDICATOR_STYLES.wishlist` | Green badge |

Use `BADGE_STYLES` for text badges:

| Badge | Constant | Usage |
|-------|----------|-------|
| **Match** | `BADGE_STYLES.success` | Green "Match" pill |
| **Warning** | `BADGE_STYLES.warning` | Amber warning text |

### Mode-Specific Behavior

**Wishlist Editor Mode:**
- Click perks to select (blue highlight)
- Matching instances highlighted with blue border
- Non-matching instances dimmed

**Coverage Analysis Mode:**
- Hover perks to explore (light blue highlight)
- Instances with hovered perk sort to top
- Non-matching instances dimmed

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

### Our Extended Format vs DIM Support

We extend the DIM format with additional fields that **DIM ignores but our app preserves**:

**Our full format:**
```
dimwishlist:item=123&perks=456,789#notes:Great roll [YT: Aztecross https://youtube.com/watch?v=abc @2:34]|tags:pve,mkb
```

| Field | Our App | DIM Import | Notes |
|-------|---------|------------|-------|
| `item=` | ✅ Parsed | ✅ Parsed | Weapon hash (negative = trash) |
| `&perks=` | ✅ Parsed | ✅ Parsed | Comma-separated perk hashes |
| `#notes:` | ✅ Parsed | ✅ Parsed | Shows in DIM item popup |
| `\|tags:` | ✅ Parsed | ❌ Ignored | DIM's parser doesn't read this |
| `[YT: ...]` | ✅ Extracted | ✅ In notes | Embedded in notes, visible in DIM |

**Why `|tags:` doesn't work in DIM:**
- DIM's [wishlist-file.ts](https://github.com/DestinyItemManager/DIM/blob/master/src/app/wishlists/wishlist-file.ts) only parses `item`, `perks`, and `notes`
- Community wishlists use `|tags:` as a convention for human readability, but DIM ignores it
- The [DIM Wiki](https://github.com/DestinyItemManager/DIM/wiki/Creating-Wish-Lists) only documents `#notes:` syntax

**Workaround for DIM tag searching:**
If you want tags searchable in DIM, include them as hashtags in your notes:
```
#notes:Great roll #pvp #controller
```
Then search `wishlistnotes:pvp` in DIM.

**Our approach:**
We keep `|tags:` for our internal use (displays in our UI, preserved on re-import) while also embedding YouTube data in notes so it's visible when viewing the wishlist in DIM.

### Wishlist Tags

Tags categorize rolls for filtering and organization. Saved rolls are **god rolls by default** - no tag needed.

| Tag | Purpose | Color |
|-----|---------|-------|
| `pvp` | PvP activity | Red |
| `pve` | PvE activity | Blue |
| `mkb` | Mouse & keyboard optimized | Gray |
| `controller` | Controller optimized | Gray |
| `alt` | Alternative/budget roll (good but not best) | Gray |

**Design rationale:**
- No `godroll` tag - if you're saving a roll to your wishlist, it's implied to be a god roll
- `alt` marks the exceptions: "this roll is solid if you don't have the god roll"
- Activity tags (`pvp`/`pve`) and input tags (`mkb`/`controller`) can be combined

**Example usage:**
```
|tags:pvp,mkb       # PvP roll optimized for mouse & keyboard
|tags:pve           # PvE god roll
|tags:pve,alt       # Good PvE alternative, not the best
```

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

## Consolidated Wishlist Cards

Large community wishlists like Voltron contain dozens of near-identical entries per weapon (one line per exact perk combination). Instead of showing 40+ individual cards for a single weapon, the app **consolidates** these into a single unified card.

### How It Works

| Wishlist Type | Display | Reason |
|--------------|---------|--------|
| **Large presets** (Voltron, JAT-MnK, Choosy Voltron) | Consolidated card | Merges all perk combinations into one perk matrix |
| **Small presets** (StoicalZebra) | Individual cards | Curated rolls, each deserves its own card |
| **Custom wishlists** | Individual cards | User-created, full CRUD actions |

### Consolidated Card Features

- **Unified perk matrix**: Shows ALL recommended perks from all entries combined
- **Combined notes**: De-duplicates and summarizes notes from multiple entries (shows "Summarized from X notes" indicator)
- **Tag union**: Shows all unique tags across consolidated entries
- **YouTube info**: Shows primary YouTube link with "+N more" indicator
- **View action**: Click to see all perks highlighted in the weapon detail matrix

### Variant Grouping

Consolidated cards group items by **weapon name only**, so all variants (holofoil, seasonal re-releases, etc.) appear in a single card. This differs from inventory deduplication which groups by season/watermark.

---

## Wishlist Types & Permissions

Wishlists are editable based on their **size** (roll count):

| Wishlist Size | View | Edit | Export | Delete |
|---------------|------|------|--------|--------|
| **≤500 rolls** (StoicalZebra, etc.) | Yes | Yes | Yes | Premade: No, Custom: Yes |
| **>500 rolls** (Voltron, etc.) | GitHub link | No | No | No |

### Why Size-Based Permissions?

Large wishlists like Voltron (~50,000+ rolls) would cause performance issues if rendered in the editable UI. They're view-only with a direct link to GitHub for forking.

Smaller curated wishlists (like StoicalZebra, PandaPaxxy individual lists) are fully editable in-app.

### Design Philosophy

Users can create and edit their own custom wishlists - no need for external tools like LittleLight.

What we intentionally removed:
- **Fork/copy preset wishlists** - Voltron has 240K+ items; forking creates massive local copies
- **In-app viewing of large preset contents** - Rendering 240K items crashed browsers

If you want to see what's in a large preset like Voltron, click "View on GitHub" to see the raw file. If you want your own wishlist, create a custom one from scratch or import a DIM-format file.

### Editing Premade Wishlists (StoicalZebra, etc.)

Premade wishlists under 500 rolls can be edited directly in the app with a manual sync workflow.

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

Bungie's perk icons are designed for dark backgrounds. The icon images have transparent backgrounds with colored/white foreground elements. The app uses a semantic color token `bg-perk-background` (CSS variable `--color-perk-background`) to ensure proper contrast and visibility regardless of the page theme.

**Implementation:**
- CSS variable: `--color-perk-background: #1e293b` (slate-800) defined in both `:root` and `.dark` in `src/style.css`
- Tailwind token: `perk.background` in `tailwind.config.js`
- Usage: `bg-perk-background` class on all perk icon containers

**Correct:** `bg-perk-background` (semantic token, same dark background in both modes)
**Incorrect:** `bg-slate-200 dark:bg-slate-800` (light background in light mode breaks icon visibility)

**Important:** All perk icons should use the `PerkIcon.vue` component which handles the dark background automatically. If rendering perk icons directly, always include `bg-perk-background` on the container.

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

## Design Decisions

### Enhanced Perks Removed (2026-01-15)

**Decision:** Removed enhanced perk tracking and display from the application.

**Reasoning:**
- **Signal vs Noise**: Enhanced perks are obviously better, but typically only marginally so. For a deduplication and god roll tracking tool, the base perk name is what matters for decision-making.
- **Reduced Complexity**: Enhanced perks added ~400 lines of code for detection, mapping, UI toggles, and tests. This complexity wasn't providing proportional value.
- **Bug-Prone**: The feature had edge cases causing save errors with enhanced vs base perk hash mismatches.
- **UI Clutter**: The enhanced toggle button and gold arrow badges added visual noise without helping users make better keep/dismantle decisions.

**What We're NOT Doing**: This app doesn't compute weapon stats or DPS like d2foundry.gg, where enhanced perk bonuses would matter. For our use case (perk collection tracking), base perk names are sufficient.

**Git History**: The full enhanced perk implementation is preserved in git history if ever needed again.

---

## TODO / Future Improvements

- [ ] **Wishlist toggle performance**: Toggle response is ~200-300ms. Goal is instant (<50ms). All obvious optimizations applied; further profiling needed to identify remaining bottleneck.
- [ ] **DIM API Integration**: Implement direct Keep/Junk tagging via DIM's API


- [x] Wishlist Editor upgrades (completed 2026-01-16)
  - [x] Tags field: pvp, pve, mkb, controller, alt (PVE=blue, PVP=red, others=gray)
  - [x] YouTube data fields (link, author, timestamp) + embedding in DIM notes
  - [x] Notes field expandable (vertical resize)
  - [x] Button renamed to "Update Wishlist Roll"
  - [x] Saved rolls show tags, YouTube info, full text on hover

- [ ] "Wishlist page: "Updates available for some preset wishlists" should only show when Github URLs have updated content (determined by update date or some other method) - NOT if they are just in the "unloaded" state. The warning is always showing up if I have "large" wishlists that are unloaded.
