# D3 Deduper TODO

## UI Flow (Phase 4)
- [x] Show condensed weapon cards by default on "Your Weapons" page (image + Copies / Owned perks / Possible perks / Completion).
- [x] On weapon click, switch to a focused view that shows only the selected weapon’s punch-card matrix and hides all other weapons.

## Perk Matrix Columns
- [x] Fix column order to: Intrinsic Traits, Barrel, Magazine, Left Trait, Right Trait, Origin Trait.
- [x] Remove the Kill Tracker/Memento column from the punch-card display.

## Perk Deduping
- [x] Remove duplicate perks in columns 2–6 (treat enhanced perks as canonical and hide non-enhanced duplicates).

### Condensed view cards
Consider these stats
- [x] Copies
- [ ] Completion bar that tracks "desired perks" vs "owned perks" (will be 100% if have all desired perks)
- [ ] Would need concept of user-selected "desired perks" that live in state and don't go away; maybe even exported in some format for safety

### Detailed / Punch-card UI view
- [x] Demote "intrinsic trait" column to a new "Additional Details" section
  - Columns 1 - 5 are now
    - Barrel (or synonyms)
    - Magazine (or synonyms)
    - Left Traits
    - Right Traits
    - Origin Traits
- [x] New "Additional Details" section with these 2 items:
  - [x] Add "Intrinsic Trait" (Example "High-Impact Frame")
  - [x] Add "Masterwork" (Example "Masterwork: Range")
- [x] When hover over any Trait that Bungie provides a description for, show pop up text description from Bungie (example: hovering over "Attrition Orbs" trait shows "Dealing sustained power creates an Orb of Power")
- [x] Fix designation of which perks are owned
  - Currently: app shows which the aggregation of perks **currently selected** right now on weapon, not an aggregation of **all perks that exist on a weapon**

## 2026-01-02
- [x] Fix Masterwork section of "Notes" (shows "None detected")
- [x] Origin Traits > Aisha's Care > 3 origin traits owned, only "Alacrity" is highlighted

## 2026-01-03
1400L
- [x] Playground changes
  - Coverage view
    - Perk Matrix section
      - [x] Missing "Origin Traits" column
      - [x] Missing "Masterwork" column or selection
      - [x] Only showing a small subset of all perks; the idea of this section is show ALL available perks for a weapon just like the Punchcard view; then when the user clicks on a particular perk in the perk matrix section, the individual instances that contain that perk should be highlighted in the Instances section on the right (you have this interaction correct already with "Simple Highlight" and "Segmented Bars" visualization modes)
    - Instance section
      - [x] Remove the descriptors in parentheses (PVP, PVE, etc.) for each instance
      - [x] Use "Roll 1" and "Roll 2" instead of "A" and "B" (numbers instead of letters)
      - [x] For each instance, show the full "perk matrix" of that instance (show all 6 columns and however many rows needed); but keep the font size small so it doesn't take up too much space just like you have it now
  - God Roll view
    - [x] Change "Target Definition" section name to "God Roll Selector"
    - [x] Same as Coverage view, only showing a small subset of all perks; the idea of this section is show ALL available perks for a weapon just like the Punchcard view
    - [x] Change "Matches" section name to "Your Owned Rolls"
      - [x] Remove the descriptors in parentheses (PVP, PVE, etc.) for each instance
      - [x] Use "Roll 1" and "Roll 2" instead of "A" and "B" (numbers instead of letters)
      - [x] For each instance, show the full "perk matrix" of that instance (show all 6 columns and however many rows needed); but keep the font size small so it doesn't take up too much space just like you have it now
    - [x] "Save Profile" button doesn't work
    - [x] Need a "Saved God Rolls" section that shows all saved profiles below the current sections / bottom of the page
      - [x] On the right of each saved profile, add an "Edit" and "Delete" button
      - [x] When the user clicks "Edit", switch to the God Roll view and load the selected profile
      - [x] When the user clicks "Delete", remove the selected profile from storage

1440L
- [x] Overall
  - [x] Anonymous Autumn (Sidearm) perk matrix is not accurate - see JSON file at https://data.destinysets.com/i/InventoryItem:1051949956?lang=en
  - [x] Not sure if innacurate perk matrix is due to just being a quick mockup or if it's a bug
- [x] Coverage view
  - [x] Instance section
    - [x] Each instance should show the full "perk matrix" of that instance (show all 6 columns and however many rows needed); but keep the font size small so it doesn't take up too much space just like you have it now
- [x] God Roll view
  - [x] Save Profile button doesn't work: I can see a browser confirmation window pop-up for a split second but then it disappears
  - [x] Rename button to "Save God Roll"

1502L
- [x] I want to clarify there will be 3 views in the Detail View
  - [x] Overview View - the default view now in the main app showing simple highlighted perk matrix if any instances owned contain any perks
  - [x] Coverage View - as described in Playground
  - [x] God Roll View - as described in Playground
  - [x] So I want a total of 3 views in the Detail View, with the ability to switch between them
- [x] God Roll View
  - [x] Delete button doesn't work - shows quick popup then pop-up disappears
  - [x] Saving a new God Roll rofile overwrites the existing profile; it doesn't add a second or third profile etc.

2026-01-04
2026-01-04 - 1251L
- [x] Add current punchcard UI / "Overview" view to playground to make sure AI knows I want to preserve it
  - [x] So 3 total views in Weapons Detail View: Overview, Coverage, God Roll

2026-01-04 - 1315L
- [x] Merge playground into main app on a separate branch
  - Desired end state: 
    - Main app has 3 views in Weapons Detail View: Overview, Coverage, God Roll
      - Overview = current Weapons Detail View in main app, no conversion needed from Playground
      - Coverage = Coverage View from Playground converted for Vue / Vercel use
      - God Roll = God Roll View from Playground converted for Vue / Vercel use

2026-01-04 - 1336L
- [x] Refine branch structure
  - [x] Overview tab - no changes needed
  - [x] Coverage tab: Change name to "Perk Coverage"
  - [x] God Roll tab: 
    - [x] And / Or button descriptions: I'm thinking I want to simplify the intent. Let's call "And" → "Mandatory" and "Or" → "Optional". I think that accomplishes the same intent as the previous description but in a much simpler way. Keep the click & shift click behavior the same.
    - [x] "+New Profile" should be renamed "Clear Perks" to better reflect what it does 
    - [x] As I understand it now, we've removed the "Load Profile" buttonwhioch makes sense. To load the profile they simply click on the profile name in the "Saved God Rolls" section. To clear the profile, they click on the "Clear Perks" button. Is that correct?
    - [x] Update Profile UI: change "Save Copy" to "Save as New God Roll" and change color to green


2026-01-04 - 2048L
Thoughts on use cases

When playing Destiny 2 I want to know:
- how many copies I have?
- do I have "coverage" of the perks I tend to want?
- did I get a God Roll yet? 
  - self-made God Roll (via in-app God Roll profile maker)
  - curated God Roll (from DIM wishlists or streamer picks)?
  - If so notify me

When managing Inventory I want to know:
- did I get a God Roll yet? (see above)
- If not, what's the "best" roll I have so far
  - for a selected God Roll, which current roll most closely matches it
  - example: best roll has 4 of the 5 perks required on selected God Roll
- Be able to dedupe all lesser rolls to clean up inventory
  - Mark best roll as "locked"
  - Mark others as "unlocked"

2026-01-05 - 2010L
  - [x] Weapons Detail view > Overview: move "owned Perks" & "Possible Perks" stats up to top, next to Thumbail & Weapon name so it's there for all visualization modes & standardized
  - [x] Weapons Detail view
    - Perk Matrix isn't showing owned perks on any of 3 visualization modes
    - when hover over perk matrix, the perk and corresponding instances it exists on should be highlighted
    - Segmented bars visualizarion - only showing for Origin trait column

2026-01-05 - 2220L
- [x] Trait tool tips / descriptions when hover over in Perk Matrix as well as Intrinsic Trait in "Notes" section ("Lightweight frame" etc.)
- [ ] Consider "Clarity" enhanced tooltips in future (gives percentages, etc)
- [x] Search bar & filters: how hard to implement something like "Search or Filter by" bar in https://d2foundry.gg/
    - ![alt text](search.png)
    - [x] Cache past inputs for quicker re-entry like her "Recent Searches" section in image?
    - Filters: Weapon Type, Frame, Trait, Energy, Ammo, Slot, Rarity, Source, Season, Foundry, RPM, Craftable
      - Note: filters would be like 6-9 hours work per Claude. Don't need it. Simple sorting by most # of copies is most effective

2026-01-06
- [x] Use updated icons with season markers and tier stars
- [x] Sort instances by tier on details page
- [x] Tier filter for instances on detail page (so you can neck down and just show Tier 5s if desired)
  - by default should be all tiers / instances shown, user can then declutter / deselect instances based on tier level using buttons for each tier 1-5 if desired

- [x] Export & import user-made god rolls
  - People need to be able to save their hard work thru data resets etc.
    
- [x] Add localstorage explainer to users to understand data deletion on About page

- [x] Google Gemini agent
  - search given Youtube video
  - parse video transcript for "god roll" talk and collect:
    - time stamp & clickable URL for that time
    - transcript snippet of text
    - screenshot
  - dispaly results to user with summary like
    - Found 2 snippets of god roll talk
    - Snippet 1:
      - Time & URL
      - Text
    - Snippet 2:
      - Time & URL
      - Text


## 2026-01-07
Community picks
  Ok here's my thought on community picks for normal users
  Create - no, just admin; users can create their own god rolls / import /export etc.
  Read - yes definitely (the point of community picks is "read only" but more convenient than going to Youtube or webpage)
  Edit - no just admins
  Delete - no just admins

  So having said that, I guess I want normal users to just read comunity picks in either weapon detail page or God Roll Manager

  Admins retain full crud on community picks

To fix
- "Community Pick" section up top of weapon detial view seems to be missing
  - Also, should have Read acccess for everyone, not just admin
    - Admin login just enables the Create / Update / Delete features for Community picks
  - Make community pick cards bigger so can see all text
    - Make sure Youtuber name / Author shows up, links etc.

- Use LittleLight wishlist maker for creating your own god rolls? - https://wishlists.littlelight.club/

## 2026-01-12
Docs
- [x] Merge Idea.md into a top section called "Initial Idea" in Spec.md]

New focus: small subset of DIM & Littlelight functions needed for inventory deduping
- DIM: Wishlist usage + showing weapons with large numbers of duplicates + marking keep / junk
- Littlelight: wishlist CRUD
- My own addition: Youtube parser for God Roll videos

Workflow
- Have a good wishlist to reduce "analysis paralysis" → "What roll is good?"" (use preset wishlist, make your own custom wishlist - wishlists are compatible with DIM & Littlelight)
- UI shows which weapons in your pile of dupes are "good" according to wishlist
- Mark dupes as junk / keep in DIM (possible?)
- Go into Destiny 2 to purge vault of junk

- [x] Flow change: separate management for "what you have" vs "what you want"
  - Home page: "what you have" management
    - Shows overview of inventory
    - Click into specific weapon: see "Perk Coverage" on Weapons Detail view
    - Wishlist visibility in Wepons Detail
      - Show full existing God Roll entries between "Perk Matrix" and "Instances" (new UI, DIm doesn't have this I don't think, just "atomized" traits as thumbs up/down)
      - On each owned instance, mimic DIM display as shown in screenshot /planning/DIM Perks Grid with wishlist annotations.png
        - Visual grid of perks
        - Owned perks highlighted
        - Wishlist-matched perks have thumbs up/down
        - Hovering over perk shows perk description (DIM standard) AND WIshlist name(s) the recommendation comes from
  - Wishlist Tab: "waht you want" management
    - Preset wishlists are mostly done
    - User generated wishlists need work for CRUD aspects
    - I'd like to re-use existing "Set Your God Rolls" → "God Roll Creator" UI if possible for user 
    wishlist CRUD entries
      - If no user wishlist exists = prompt to create; if multiple exist, have dropdown / choice for which wishist to add entry to
    - Where to access this wishlist CRUD UI? 2 places?
      - 1) Keep where it is now but save to a user generated, DIM-standard wishlist (Not "Saved God Rolls") as it is now
      - 2) There should be an "Edit" button on each entry for a "custom" / user-generated wishlists (only have "Remove" now) 
        - Clicking "edit" on each entry brings up the "God Roll Creator" UI to allow edits. Update brings back to main custom wishlist view
        - change cards for each entry in wishlist to mimic DIM perk matrix

- [x] Rethink mental model of inventory coverage vs wishlist CRUD

- [ ] DIM markings: mark as junk in DIM


## 2026-01-13
Wishlist roll oerks all get converted to "AND" / mandatory perks. Breaks lookup feature in inventory.

## 2026-01-14
Little Light web app wishlist manager is unfortunately too buggy. Committing to fixing mine and making it good. Sticking with default DIM .txt files

Focus
- wishlist management
- finding rolls that meet wishlist

Feature changes
- [x] Weapon Detail View UI merge

I want 2 main modes / functions for this page
1) (DEFAULT) I am editing my God rolls
2) I want to see my analysis or my perk coverage adn 1 modal / pop up
- both modes show advice / thumbs up from Wishlists Applied

To do
- separate "Wishlists Applied" section from the "Coverage Analysis" dropdown
- Move "Wishlists Applied" section above Perk Matrix and make it collapsible
  - When collapsed show summary of how many wishlists selected and their names

Wishlist Mode - DEFAULT mode
- components:  
-- Wish lists Applied
-- Perk Matrix
-- Save to wishlist section (as needed when click perks) - **UNIQUE TO THIS MODE**
-- In your Inventory

Perk Coverage Analysis - secondary mode
- components:  
-- Wish lists Applied
-- Coverage Analysis toggle (Simple / Detailed) - **UNIQUE TO THIS MODE**
-- Perk Matrix
-- In your Inventory

As for how the user changes from Wishlist Mode → Perk Analysis mode - I am open to ideas but I had some ideas
- Toggle / slider between modes
  - Start in Wishlist mode
  - SLide toggle to analysis mode
  - Hit "Cancel analysis mode" to return to main WIshlist mode
- Wishlist is primary mode but Analysis is an overlay / modal pop-up?

## 2026-01-16
CRUD update in weapon detail view
I'm trying to work through CRUD changes to Saved Wishlist rolls

What I think I want...

Saved Wishlist Rolls:
Bottom row, right corner of Saved wishlist rolls card: add "View" and "Edit" buttons
- View: populates Perk Matrix with wishlist roll perks to allow matches to be shown in Inventoru
- Edit: populates Perk Matrix with wishlist roll perks and opens up the "Update Wishlist Roll" form
- Delete: deletes saved roll (with warning beforehand)

Perk Matrix
- Clicking on random Perk Matrix options: just keeps us in "read" or "View" mode: "does this match inventory rolls" functionality" and also displays a "Create Wishlist Roll" button to left of "Clear Perks" button in case user wants to Create a roll

Create: User clicks on "Create Wishlist Roll" button when perks are selected in Perk Matrix - "Save to Wishlist" form appears but rename button to "Create In Wishlist"

Read: User clicks on "View" button" on Saved Wishlist card. Populates Perk Matrix with wishlist roll perks. No form opens.

Update: triggered by user clicking "Edit" on Saved Wishlist card. Same workflow as now. Populates Perk Matrix with wishlist roll perks and opens up the "Update Wishlist Roll" form

Delete: triggered by user clicking "Delete" on Saved Wishlist card. deletes saved roll (with warning beforehand)

## 2026-01-17

### Saved Wishlist Rolls changes needed
- Currently each line in large permade wishlists gets turned into an individual card, visually overwhelming, 40+ nearly duplicate cards for 1 weapons (each card only a slight perk change between the other)

- Option 1) Text-only cards for large pre-made lists (Voltron, Choosy Voltron and Just Another Team)
  - For large premade wishlists, have a single card showing
    - left column: text explanation to users for large premade wishlists workflow
      - use green thumbs up in Perk Matrix to see chosen perks
      - Reason: de-clutter wishlist cards UI (wishlists would often have 40+ separate roll combinations)
    - right column: keep current text "note" view of wishlist entry 

- Option 2) have Claude figure out a way to recombine the factorial (?) / "spread-out" / single-line-per-combination DIM wishlists into a single cohesive perk matrix that covers all listed combinations into one card.
  - Basically- have all the "green thumbs up" perks shown in Perk Matrix also be represented in the Saved Wishlist Rolls card 

- Re-enable Choosy Voltron
  - Implement thumbs down mechanic like DIM








