export interface MockPerk {
    id: string
    name: string
    colIndex: number
    description?: string
}

export interface MockInstance {
    id: string
    name: string
    power: number
    perks: string[] // List of perk IDs
}

// Full perk pool for "Anonymous Autumn" (Tier 5 simulation based on real data)
export const ALL_PERKS: MockPerk[] = [
    // Column 0: Barrels (Standard Pool)
    { id: 'b-fullbore', name: 'Full Bore', colIndex: 0 },
    { id: 'b-corkscrew', name: 'Corkscrew Rifling', colIndex: 0 },
    { id: 'b-arrowhead', name: 'Arrowhead Brake', colIndex: 0 },
    { id: 'b-chambered', name: 'Chambered Compensator', colIndex: 0 },
    { id: 'b-extended', name: 'Extended Barrel', colIndex: 0 },
    { id: 'b-fluted', name: 'Fluted Barrel', colIndex: 0 },
    { id: 'b-hammer', name: 'Hammer-Forged Rifling', colIndex: 0 },
    { id: 'b-polygonal', name: 'Polygonal Rifling', colIndex: 0 },
    { id: 'b-smallbore', name: 'Smallbore', colIndex: 0 },

    // Column 1: Magazines (Standard Pool)
    { id: 'm-ricochet', name: 'Ricochet Rounds', colIndex: 1 },
    { id: 'm-extended', name: 'Extended Mag', colIndex: 1 },
    { id: 'm-alloy', name: 'Alloy Mag', colIndex: 1 },
    { id: 'm-appended', name: 'Appended Mag', colIndex: 1 },
    { id: 'm-armor', name: 'Armor-Piercing Rounds', colIndex: 1 },
    { id: 'm-highcal', name: 'High-Caliber Rounds', colIndex: 1 },
    { id: 'm-flared', name: 'Flared Magwell', colIndex: 1 },
    { id: 'm-light', name: 'Light Mag', colIndex: 1 },

    // Column 2: Trait 1 (Real Anonymous Autumn Pool)
    { id: 't1-eddy', name: 'Eddy Current', colIndex: 2 },
    { id: 't1-demo', name: 'Demolitionist', colIndex: 2 },
    { id: 't1-strat', name: 'Strategist', colIndex: 2 },
    { id: 't1-attrition', name: 'Attrition Orbs', colIndex: 2 },
    { id: 't1-rangefinder', name: 'Rangefinder', colIndex: 2 },
    { id: 't1-lonewolf', name: 'Lone Wolf', colIndex: 2 },
    { id: 't1-zen', name: 'Zen Moment', colIndex: 2 },
    { id: 't1-hip', name: 'Hip-Fire Grip', colIndex: 2 },
    { id: 't1-moving', name: 'Moving Target', colIndex: 2 },
    { id: 't1-outlaw', name: 'Outlaw', colIndex: 2 },
    { id: 't1-pulse', name: 'Pulse Monitor', colIndex: 2 },

    // Column 3: Trait 2 (Real Anonymous Autumn Pool)
    { id: 't2-volt', name: 'Voltshot', colIndex: 3 },
    { id: 't2-desperate', name: 'Desperate Measures', colIndex: 3 },
    { id: 't2-swash', name: 'Swashbuckler', colIndex: 3 },
    { id: 't2-frenzy', name: 'Frenzy', colIndex: 3 },
    { id: 't2-killclip', name: 'Kill Clip', colIndex: 3 },
    { id: 't2-rampage', name: 'Rampage', colIndex: 3 },
    { id: 't2-adagio', name: 'Adagio', colIndex: 3 },
    { id: 't2-preins', name: 'Precision Instrument', colIndex: 3 },

    // Column 4: Origin Traits (Real Pool)
    { id: 'o-field', name: 'Field-Tested', colIndex: 4 },
    { id: 'o-onequiet', name: 'One Quiet Moment', colIndex: 4 },
    // Keeping Suros as placeholder if old drops exist, but prioritizing real ones
    { id: 'o-suros', name: 'Suros Synergy', colIndex: 4 },

    // Column 5: Masterworks
    { id: 'mw-range', name: 'Range MW', colIndex: 5 },
    { id: 'mw-stability', name: 'Stability MW', colIndex: 5 },
    { id: 'mw-handling', name: 'Handling MW', colIndex: 5 },
    { id: 'mw-reload', name: 'Reload MW', colIndex: 5 },
]

// Mock Instances with full rows (6 perks each)
// UPDATED: Now some instances have MULTIPLE perks in cols 0/1 to match feedback
export const MOCK_INSTANCES: MockInstance[] = [
    {
        id: 'inst-1',
        name: 'Roll 1',
        power: 1810,
        // Double Barrel / Double Mag
        perks: ['b-fullbore', 'b-smallbore', 'm-ricochet', 'm-light', 't1-rangefinder', 't2-killclip', 'o-onequiet', 'mw-range']
    },
    {
        id: 'inst-2',
        name: 'Roll 2',
        power: 1809,
        perks: ['b-corkscrew', 'm-extended', 't1-lonewolf', 't2-volt', 'o-field', 'mw-stability']
    },
    {
        id: 'inst-3',
        name: 'Roll 3',
        power: 1805,
        perks: ['b-fullbore', 'b-hammer', 'm-alloy', 't1-demo', 't2-headstone', 'o-onequiet', 'mw-handling']
    },
    {
        id: 'inst-4',
        name: 'Roll 4',
        power: 1800,
        perks: ['b-arrowhead', 'm-ricochet', 't1-zen', 't2-frenzy', 'o-suros', 'mw-reload']
    },
    {
        id: 'inst-5',
        name: 'Roll 5',
        power: 1810,
        perks: ['b-smallbore', 'm-flared', 't1-moving', 't2-killclip', 'o-field', 'mw-range']
    },
    {
        id: 'inst-6',
        name: 'Roll 6',
        power: 1808,
        perks: ['b-fluted', 'm-light', 't1-eddy', 't2-swash', 'o-onequiet', 'mw-stability']
    },
    {
        id: 'inst-7',
        name: 'Roll 7',
        power: 1802,
        perks: ['b-hammer', 'm-highcal', 't1-outlaw', 't2-adagio', 'o-field', 'mw-handling']
    },
]

export const COLUMN_HEADERS = [
    'Barrel', 'Magazine', 'Trait 1', 'Trait 2', 'Origin', 'Masterwork'
]

export const INSTANCE_COLORS: Record<string, string> = {
    'inst-1': '#EF4444',
    'inst-2': '#F59E0B',
    'inst-3': '#10B981',
    'inst-4': '#3B82F6',
    'inst-5': '#8B5CF6',
    'inst-6': '#EC4899',
    'inst-7': '#14B8A6',
}
