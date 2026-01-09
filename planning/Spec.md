# D3 Deduper Specification

## Goals / Modes (Use Cases)
### Goals
1. User has a large collection of Destiny 2 weapons
2. User wants to just play Destiny 2 now, and worry about inventory management later
3. User would like an app on a "second screen" to help them see progress towards acquiring their personal "god roll" weapon while they play
4. After playing, User wants help deduplicating their weapon rolls to save vault space while keeping the god roll they want

### Modes
#### Farming mode
User: "I just want to play Destiny 2 and collect loot, don't ask me questions right now. Just show me which perks I have collected on this new weapon I'm farming for. I'll muck around in my inventory later when I'm ready to make decisions."
- Likely filled by Punchcard UI & Coverage UI

#### "Dedupe" mode (Deduplication)
User: "I want to tidy up my inventory. I know what "god rolls" I want to keep, show me which weapons I can dismantle and which I should keep."
- Likely filled by God Roll UI

## Bungie Weapon Information
- Assume all weapons are Tier 5 for simplicity now
    - [ ] Consider fleshing out non-tiered weapons in future
- Bungie Tier 5 weapon characterstics source (aside from API): https://www.bungie.net/7/en/News/Article/dev_insights_weapon_gear_tier
- Tier 5 weapon characterstics we want to track in our app
    - "Weapon Components" (Barrel, Magazine, Rail, Bolt, etc)
        - Column 1: 2 traits max
        - Column 2: 2 traits max
    - "Weapon Traits" (also called "Perks")
        - Column 3: 3 traits max
        - Column 4: 3 traits max
    - Other Traits
        - Origin Trait: Depends on weapon type, max should be the max origin traits that can possibly drop for that weapon type
        - Masterwork (in "Notes" section)
- Weapon characterstics we don't want to track in our app
    - Mod socket slot (counterbalance mod, backup mag mod, etc.)
    - Ornament slot (purely cosmetic)
    - Shader slot (purely cosmetic)
    - Kill tracker slot (track kills in PVE vs PVP etc)
- Basic vs Enhanced Traits
    - Assume all traits are enhanced now that tier 5 weapons are raining down from the heavens
    - Will readress if Bungie changes standard drops
    - Do not distinguish in our app
    - [ ] Make sure tooltip shows the definition from the Enhanced trait, not the Basic trait
    - [ ] Make sure tooltip shows the icon from the Enhanced trait, not the Basic trait


## UI
### Weapons view (Inventory view)
Show all weapons, with identical weapons grouped together
- Example: 5 copies of "Anonymous Autumn" legendary primary sidearms only show 1 card, with a count of 5
- Stats to show on card:
    - Copies
    - [ ] Perks Owned Across All Copies
        - [ ] Owned Perks / Possible Perks
        - [ ] Shown as a horizontal bar, filled in with percentage of owned perks, and the text of owned / possible perks shown over top
- [ ] Add filters below the search bar similar to D2Foundry - https://d2foundry.gg/
    - [ ] Weapon Type, Frame, Trait, Energy, Ammo, Slot, Rarity, Source, Season, Foundry, RPM, Craftable

### Weapons Detail View (Dedupe screen with multiple views of a single weapon)
Workflow
- User clicks a weapon in the Weapons view
- Brought to new view showing detailed / punchcard UI

#### Overview tab ("Punchcard" UI)
- Already implemented
- Shows typical Destiny 2 "weapon perks grid" similar to DIM, Foundry.gg, Light.gg etc.
- ![alt text](punchcard_ui.png)

#### Perk Coverage tab
Idea only
- [ ] need new name for "Coverage"; idea is you want more granular view over what weapon instances are contributing to each Punchcard trait being highlighted / filled in / covered

Workflow
- User clicks on "Coverage" button
- Punchcard UI maps perks contained in each individual instance of weapon to a color section of the particular trait row
    - Example: 5 copies of "Anonymous Autumn" legendary primary sidearms 
    - Of the 5 copies, only 2 contain the trait "Lone Wolf"
    - User clicks "Coverage" button
    - UI changes
        - Punchcard UI changes the color of the "Lone Wolf" trait row to now show 2 color sections; each color section maps to the copy / instance of the weapon that contains that perk in the "Instances" section of the UI
        - "Instances" section shows matching color highlights to the trait row in Punchcard UI
        - SO with "Coverage" enabled, the user can see which copies of the weapon contain which perks. In this case, the user can see that 2 copies contain the "Lone Wolf" perk, and 3 copies do not. And the Punchcard UI shows "Lone Wolf" trait row split with 2 colors (lets say red and blue), with the appropriate weapon instance also highlighted in red or blue
        - If the user hovers over the blue section of the "Lone Wolf" trait row in Punchcard UI, the user can see the name of the weapon instance that contains that perk "pulsing"
        - Likewise, if the user hovers over the blue highlighted weapon instance in the "Instances" section, the user can see the name of the trait row that contains that perk "pulsing"
        - Note: I am not 100% decided on the "multiple color sections" idea for trait rows mapping to weapon instances. I think it is a good idea, but I am definitley open to other ideas
            - The key concept: 
                - User hovers over an individual trait in the Punchcard UI section, and can see which instances of the weapon contain the perk they are hovering over
                - User hovers over an individual instance of the weapon in the Instances section, and can see which traits are contained in that instance in the Punchcard UI section

#### "Set Your God Roll" tab
Probably do this after the granular view of "Coverage" is implemented

Workflow
- User clicks "Pick my god roll perks" button
- New "god roll" section appears beneath the Punchcard UI section
- So layout would probably be:
    - "Weapon Details" section
        - Punchcard UI section
        - Notes section
        - Instances section
    - "God Roll" section (optional, if user creates a "God Roll" profile)
        - God Roll profile 1 (each saved god roll called a "profile"?)
        - God Roll profile 2
        - God Roll profile 3, etc
- God Roll profile mechanics:
    - User clicks "Create God Roll Profile" button
    - User can create a god roll profile by selecting perks from a new copy of the Punchcard UI
    - For each column, user can use "and / or" logic to select which perks they want to keep
    - Maximum traits per column should follow the Bungie API limit for Tier 5 weapons (see "Bungie Weapon Information" section above for limits)
- God Roll profile should be saved to local storage
- User should be able to Create, Edit, and Delete God Roll profiles
- [x] God Roll profile should have a text notes section at the bottom of the profile

##### Community Picks (Section in the God Roll tab)
- [ ] Community picks: ability to have curated list of God Rolls from streamers / internet (Aztecross, Mave, Coolgut / PVE & PVP)
    - Idea if for an admin-only list of pre-made / curated God Rolls that can be selected / viewed / used on the God Roll view. Need some way for admin to add curated God Rolls to the list
- Workflow Idea: 
    - [ ] Add a new "Community Picks" section
        - [ ] section could either be a new sub-page view you go to via a new button in the God Roll view; OR as a collapsible section just above God Roll creator
            - I'm leaning towards UI being a collapsble section just above God Roll creator
            - You "unfurl" the "Community Picks" section, see if any pre-made community picks for the weapon interest you, hit "Save to my God Rolls" button to get it addded to "Saved God Rolls" list
        - [ ] Clicking "Community Picks" button opens a new "Community Picks" view with a list of curated, pre-filled God Rolls from Community / internet (Aztecross, Mave, Coolgut / PVE & PVP)
        - [ ] Community picks should include PVE/PVP, Streamer name, link to their web page or YouTube video timestamped clip of the God Roll
    - [ ] Clicking "Save this to my God Roll list" button saves the God Roll to the user's unique God Roll list and returns them to their God Roll view
    - [ ] For me and other Admins, an "Edit Community Picks" button in the new "Community Picks" view allowing me to create, edit, and delete curated God Rolls in the same way as the "Edit God Roll" button in the God Roll view
    - In a sense, the "Community Picks" section is just another "God Roll" view that only I control & curate, but that is published to everyone for their use
- Big news - this wishlist creation / distribution capability exists already in GUI form - 
    - Pre-built wishlists & wishlist creation tools are already available
        - Can use these prebuilt wishlists as a starting point for the "Community Picks" section
        - Can then add my own curated wishlists to the list for everyone to use from (Aztecross, Mave, Coolgut / PVE & PVP)
    - Likely workflow:
        - Existing / pre-built wishlists: 
            - Get D3 app to import existing wishlists from GitHub
            - See instructions for AI to learn how wishlists are structured here - https://github.com/DestinyItemManager/DIM/wiki/Creating-Wish-Lists#constructing-wish-list-rolls-manually
            - Show some pre-built wishlists from in our D3 app they can toggle on / off easily from top of the "Community Picks" section
            - Provide way to auto-update wishlists from GitHub
            - Show "Current as of" date for pre-made wishlists with date linking to GitHub commit
        - New wishlists (if user REALLY wants to make wishlist instead of using our own in-app "Save God Roll" feature): 
            - provide users instructions on how to create LittleLight wishlists with D3 app (see https://github.com/DestinyItemManager/DIM/wiki/Creating-Wish-Lists for instructions)
            - Instructions from DIM Discord channel: 
                - 1. go to this website. https://wishlists.littlelight.club/
                - 2. click create new wishlist
                - 3. give it a name and description
                - 4. click create
                - 5. click add item
                - 6. search for / select an item
                - 7. select the perks you want on a roll
                - 8. add tags / name / description to that roll
                - 9. click save build
                - 10. repeat for more rolls.
                - 11. once complete, click export wishlist and choose DIM as the type. that will save a file.
                - 12. go to DIM > settings > wishlist and click load wish list rolls
                - 13. select your file.
        - Export wishlists in different formats
            - Not sure how hard the fomrats will be
            - JSON first; then maybe DIM, CSV, XLSX (same as littlelight - https://wishlists.littlelight.club/#/)

##### Community Picks - Implementation (January 2025)
- [x] Collapsible section above God Roll Creator
- [x] Pick cards show: name, PVE/PVP tag, streamer name, source link
- [x] "Save to my God Rolls" button copies pick to user's saved profiles
- [x] Admin mode via `?admin=true` URL param
- [x] Data stored in `data/community-picks.json`, fetched from GitHub

**Admin Workflow for Creating Community Picks:**
1. Navigate to weapon detail → "Set your God Roll" tab
2. Add `?admin=true` to URL (e.g., `/weapons/123456?admin=true`)
3. Community Picks section appears with "+ Add Community Pick" button
4. In God Roll Creator below, select perks for your recommended roll
5. Click "+ Add Community Pick" button
6. Fill form: name, category (PVE/PVP), streamer name, source URL
7. Click "Copy from God Roll Creator" to capture your perk selection
8. Click "Add Pick" - JSON is auto-copied to clipboard
9. Paste into `data/community-picks.json` and commit to repo
10. After deploy, picks appear for all users

**Note:** Admin UI changes are temporary until committed. Refreshing loses unsaved work.

##### God Roll Data Architecture

The app has **two separate data sources** for god rolls:

**1. Community Picks** (`data/community-picks.json`)
- Static JSON file committed to the repo
- Admin-curated recommendations from streamers/community
- Loaded via `communityPicksService.getPicksForWeapon(weaponHash)`
- Displayed in the "Community Picks" collapsible section on weapon detail
- Users can click "Add to my God Rolls" to copy a pick to their local storage

**2. Saved God Rolls** (localStorage `d3_godroll_<weaponHash>`)
- User's personal saved god rolls stored in browser localStorage
- Created via the God Roll Creator on weapon detail page
- Managed via `godRollStorageService`
- Can include rolls imported via Settings page (JSON import)
- Displayed in "Saved God Rolls" section and in God Roll Manager view

**God Roll Manager View** (`/godrolls`)
- Shows all saved god rolls from localStorage across all weapons
- Accessible from nav bar (auth-required)
- Search by weapon name, sort by A-Z or Most Profiles
- Click weapon → opens weapon detail at "Set your God Rolls" tab
- For weapons not in user's inventory, shows placeholder view with saved god roll info

**Import/Export Flow**
- Export: Settings → "Export God Rolls" → Downloads JSON with all localStorage rolls
- Import: Settings → "Import God Rolls" → Merges/replaces localStorage rolls
- YouTube Agent: Python script extracts god rolls from YouTube transcripts → outputs D3-compatible JSON for import

**Key Files:**
- `src/services/godroll-storage-service.ts` - localStorage CRUD operations
- `src/services/community-picks-service.ts` - Fetches community-picks.json
- `src/components/weapons/CommunityPicks.vue` - Community picks UI with admin mode
- `src/components/weapons/WeaponsGodRoll.vue` - God Roll Creator + saved profiles
- `src/views/GodRollsView.vue` - God Roll Manager listing all saved rolls
- `src/views/SettingsView.vue` - Import/export functionality
- `scripts/youtube-agent/` - YouTube transcript → god roll extractor

### Future goals
Front-end overhaul
- let Claude use it's front-end skill and see what it looks like
  - Current pallete is kind of bland

- [ ] iOS app: CapacitorJS or similar for web app → iOS app (also works for android) 
    - [ ] Notifications when God Roll profile is reached
        - [ ] User can enable / disable notifications
        - [ ] User can set notification threshold (e.g. 50%, 75%, 100%)

- "God Roll" percentage chance section
    - Should show percentage chance of acquireing your selected god roll given a single Tier 5 weapon drop
    - Example: "you selected 2 perks for column 1 using "and" logic, 2 perks for column 2 using "or" logic, 2 perks for column 3 using "and" logic, 2 perks for column 4 using "or" logic, 2 perks for column 5 using "and" logic, 2 perks for origin traits using "or" logic. Given that you expect to drop at Tier 5, you have a 10% chance of getting this god roll."
    - Need vocabulary to differentiate between "and" and "or" logic. Goal is to show that you have better odds if you are less choosy with 2 perks using "or" logic rather than **requiring** 2 perks with "and" logic.




