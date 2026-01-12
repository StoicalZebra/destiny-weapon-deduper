# D3 - Destiny DeDupe

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
   - **Application Name**: Your app name (e.g., "D3 DeDuper Dev")
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
d3deduper/
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

## Security Notes

**Never commit these files:**
- `.env.local` - Main app credentials
- `scripts/youtube-agent/.env` - YouTube agent credentials
- `scripts/youtube-agent/weapon_perk_pools.json` - Generated data
- `scripts/youtube-agent/perk_names.json` - Generated data

All are listed in `.gitignore`.
