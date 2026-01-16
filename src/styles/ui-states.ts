/**
 * Centralized UI state styling constants
 *
 * This file is the single source of truth for all visual states in the app.
 * Import from here instead of hardcoding Tailwind classes in components.
 */

// Instance card states (used in both Wishlist and Coverage modes)
export const INSTANCE_CARD_STYLES = {
  base: 'bg-surface-elevated border-border',
  match: 'bg-blue-900/50 border-blue-400 ring-2 ring-blue-400',
  dimmed: 'bg-surface/50 border-border/50 opacity-40 grayscale-[0.3]',
  hovered: 'bg-surface-overlay border-blue-300 ring-1 ring-blue-300/50',
  unfocused: 'opacity-50',
  unfocusedDetailed: 'opacity-40 grayscale-[0.5]',
  dimSelected: 'ring-2 ring-blue-500',
  detailedHovered: 'ring-2 ring-white border-transparent',
} as const

// Perk ring variants (used by PerkIcon and inline perk styling)
export const PERK_RING_STYLES = {
  default: 'ring-1 ring-slate-400 dark:ring-slate-500 ring-offset-1 ring-offset-surface',
  selected: 'ring-2 ring-blue-400 ring-offset-1 ring-offset-surface',
  hovered: 'ring-2 ring-blue-300 ring-offset-1 ring-offset-surface',
  highlighted: 'ring-2 ring-orange-500 ring-offset-1 ring-offset-surface',
  wishlist: 'ring-2 ring-yellow-500 ring-offset-1 ring-offset-surface',
  owned: 'ring-1 ring-white/80 ring-offset-1 ring-offset-surface',
  unowned: 'ring-1 ring-border opacity-40',
  none: '',
} as const

// Perk row backgrounds (the container around each perk in the matrix)
export const PERK_ROW_STYLES = {
  base: 'bg-surface-elevated border-border',
  selected: 'bg-blue-900/40 border-blue-500/70 ring-1 ring-blue-500/50',
  hovered: 'bg-surface-overlay border-blue-300 ring-1 ring-blue-300/50',
  highlighted: 'bg-surface-overlay/50 border-blue-300/50',
  dimmed: 'bg-surface-elevated border-border opacity-40',
  unowned: 'bg-surface-elevated/30 border-border/50',
  unownedHover: 'bg-surface-elevated/30 border-border/50 hover:bg-surface-overlay/30',
  ownedHover: 'bg-surface-elevated border-border hover:bg-surface-overlay',
} as const

// Status badges (Match, Enhanced, etc.) - text badges with background
export const BADGE_STYLES = {
  success: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  warning: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
  info: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  error: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200',
} as const

// Icon indicator badges (small circular icons on perk corners)
export const INDICATOR_STYLES = {
  wishlist: 'bg-green-600', // thumbs-up indicator
} as const

// Button variants
export const BUTTON_STYLES = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white',
  success: 'bg-green-700 hover:bg-green-600 text-white border border-green-600',
  warning: 'bg-orange-600 hover:bg-orange-500 text-white border border-orange-500',
  danger: 'bg-red-600 hover:bg-red-500 text-white',
  ghost: 'text-text-muted hover:text-text hover:bg-surface-elevated',
} as const

// Instance color palette (for coverage visualization - colored left borders)
export const INSTANCE_PALETTE = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F43F5E',
  '#84CC16',
  '#22C55E',
  '#14B8A6',
  '#0EA5E9',
  '#64748B',
] as const

// Masterwork icon styling (simplified display - just shows stat name, no enhanced distinction)
export const MASTERWORK_ICON_STYLES = {
  container: 'w-7 h-7 rounded-full overflow-hidden bg-black',
  // Medium size to match PerkIcon md (w-8 h-8) for wishlist displays
  containerMd: 'w-8 h-8 rounded-full overflow-hidden bg-black',
  ring: 'ring-1 ring-slate-400 dark:ring-slate-500 ring-offset-1 ring-offset-surface',
  // Filters to standardize all MW icons to white glyphs (removes gold/colored variants)
  image: 'w-full h-full object-cover brightness-[1.75] contrast-125 saturate-0',
  // Smaller variant for dropdown selectors
  containerSmall: 'w-5 h-5 rounded-full overflow-hidden bg-black',
} as const

// Dropdown selector styling (used by MW selector, potentially other dropdowns)
export const DROPDOWN_STYLES = {
  // Column header label style (matches perk matrix headers)
  label: 'text-xs uppercase font-bold text-center text-text-muted tracking-wider',
  // Trigger button base
  triggerBase: 'w-full flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs',
  // Trigger button states
  triggerSelected: 'bg-blue-900/40 border-blue-500/70 text-text',
  triggerUnselected: 'bg-surface-elevated border-border text-text-muted hover:bg-surface-overlay',
  // Dropdown panel
  panel: 'absolute z-20 w-full mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto',
  // Option base
  optionBase: 'w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-left transition-colors hover:bg-surface-overlay',
  // Option selected state
  optionSelected: 'bg-blue-900/30',
  // "None" option placeholder icon
  noneIcon: 'w-5 h-5 rounded-full border border-dashed border-text-muted/50 flex items-center justify-center',
  noneIconText: 'text-text-muted/50 text-[10px]',
} as const

// Wishlist tag display styles (used in saved rolls display)
// Color scheme: PVE=blue, PVP=red, Others=gray
// Note: No "godroll" tag - saved rolls are god rolls by default. "alt" marks alternatives.
export const TAG_DISPLAY_STYLES = {
  pvp: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700/50',
  pve: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700/50',
  default: 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600/50',
} as const

// Wishlist tag button styles (used in editor multi-select)
export const TAG_BUTTON_STYLES = {
  pvp: {
    selected: 'bg-red-600 border-red-500 text-white',
    unselected: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700/50 text-red-700 dark:text-red-300 opacity-60 hover:opacity-100',
  },
  pve: {
    selected: 'bg-blue-600 border-blue-500 text-white',
    unselected: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700/50 text-blue-700 dark:text-blue-300 opacity-60 hover:opacity-100',
  },
  default: {
    selected: 'bg-gray-600 border-gray-500 text-white',
    unselected: 'bg-gray-100 dark:bg-gray-800/30 border-gray-300 dark:border-gray-600/50 text-gray-600 dark:text-gray-400 opacity-60 hover:opacity-100',
  },
} as const

// Tag tooltips (hover text for tag buttons/badges)
export const TAG_TOOLTIPS: Record<string, string> = {
  pvp: 'PVP Roll',
  pve: 'PVE Roll',
  mkb: 'Best on Mouse & Keyboard',
  controller: 'Best on Controller',
  alt: 'Alternate Roll - good but not great',
  trash: 'Undesirable roll',
} as const

// Type export for consumers (PerkRingStyle is used by PerkIcon.vue)
export type PerkRingStyle = keyof typeof PERK_RING_STYLES
