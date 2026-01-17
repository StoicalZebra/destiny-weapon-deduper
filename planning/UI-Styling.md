# UI Styling Guide

The weapon detail view uses a consistent **blue-centric color language** across both Wishlist Editor and Coverage Analysis modes.

## Centralized Style Constants

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

## Color Scheme Philosophy

The UI uses only **3 primary perk states** for clarity:

| State | Meaning | Color |
|-------|---------|-------|
| **Unowned** | Perk not available on any owned instance | Gray/faded |
| **Owned** | Perk available on at least one instance | White ring |
| **Selected/Active** | User-selected or hover-highlighted | Blue |

## Perk Matrix States

Each perk is displayed as a rounded rectangle card. Use `PERK_ROW_STYLES` and `PERK_RING_STYLES`:

| State | Constant | Visual |
|-------|----------|--------|
| **Owned (default)** | `PERK_ROW_STYLES.ownedHover` | Light bg, white ring |
| **Unowned** | `PERK_ROW_STYLES.unowned` | Faded bg, gray ring |
| **Hovered** | `PERK_ROW_STYLES.hovered` | Blue border highlight |
| **Selected** | `PERK_ROW_STYLES.selected` | Dark blue bg, blue ring |

## Inventory Card States

Instance cards use `INSTANCE_CARD_STYLES`:

| State | Constant | Visual |
|-------|----------|--------|
| **Default** | `INSTANCE_CARD_STYLES.base` | Elevated surface |
| **Hovered** | `INSTANCE_CARD_STYLES.hovered` | Light blue highlight |
| **Match** | `INSTANCE_CARD_STYLES.match` | Dark blue bg, blue ring |
| **Non-match** | `INSTANCE_CARD_STYLES.dimmed` | Grayed out |
| **DIM selected** | `INSTANCE_CARD_STYLES.dimSelected` | Blue selection ring |

## Instance Sorting

Inventory cards sort dynamically based on context:

| Context | Sort Order |
|---------|------------|
| **Default** | Numerically by instance ID |
| **Wishlist mode + perks selected** | Matches first, then by ID |
| **Coverage mode + perk hovered** | Instances with perk first, then by ID |

Instance labels show `#XXXX` (last 4 digits of instance ID) with tooltip for full ID.

## Special Indicators

Use `INDICATOR_STYLES` for icon badges:

| Indicator | Constant | Usage |
|-----------|----------|-------|
| **Wishlist thumbs-up** | `INDICATOR_STYLES.wishlist` | Green badge |

Use `BADGE_STYLES` for text badges:

| Badge | Constant | Usage |
|-------|----------|-------|
| **Match** | `BADGE_STYLES.success` | Green "Match" pill |
| **Warning** | `BADGE_STYLES.warning` | Amber warning text |

## Mode-Specific Behavior

**Wishlist Editor Mode:**
- Click perks to select (blue highlight)
- Matching instances highlighted with blue border
- Non-matching instances dimmed

**Coverage Analysis Mode:**
- Hover perks to explore (light blue highlight)
- Instances with hovered perk sort to top
- Non-matching instances dimmed

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
