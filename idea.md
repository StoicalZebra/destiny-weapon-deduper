D3 - Destiny DeDupe

Big picture
- simplify duplicate copies of the same weapons stored in a user's Destiny 2 inventory

Why
- remove inventory management fatigue when new weapons come out
- "Ugh - I have no idea what's good on this weapon. I'm just going to hoarde every roll I get and muck thru my inventory later / never. Hey why am I out of inventory space again?..."
- Visually ID have far you've gotten to reaching your god roll and safely mark all other rolls for deletion in-game

Key features
- provide a UI that shows a singular view of all weapon roll cominations you have earned 
- Weapon roll traits (6)
  - barrel
  - magazine
  - left column traits
  - right column traits
  - origin traits
  - masterwork
- UI style is "punch-card" matrix
  - Default: see style similar to https://d2foundry.gg/ for each weapon showing the matrix of all available barrels, magazines, traits, origin traits for the weapon
- Main fuctions
  - search user's inventory for weapons
  - For each indiivdual weapon (Example: Anonymous Autumn - https://d2foundry.gg/w/1051949956?p=0,0,0,0&m=0&mw=0)
    - Fill in the matrix of all earned weapons traits, maagazine etc as if they were "merged" or "deduped" into one singular weapon instance
    - Off to the side: list the indivividual weapons in user's invintory that contribute the the "merged" or "Deduped" view


Stretch goals
- allow manual checklist of "god roll" wishlist
- notifications if you get a trait, barrel etc for a weapon that you previously had not earned
- more granular notifcations / wishlists
  - ex: allow 3 of 6, 4 of 6 etc. 

MVP Needs
- Destiny 2 API access
- ability to pull user's inventory & see weapons they've earned
- display UI showing the weapon deduping and the individual weapons that contribut to the singular "merged" / "deduped" / "consilidated" weapon matrix 
