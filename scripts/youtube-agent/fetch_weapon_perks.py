#!/usr/bin/env python3
"""
Fetch weapon perk pools from Bungie API and save to local JSON.

Run this script periodically (e.g., when new seasons drop) to update
the weapon perk pool data used by youtube_agent.py for validation.

Usage:
    python fetch_weapon_perks.py

Requires BUNGIE_API_KEY in .env file.
"""

import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

BUNGIE_API_KEY = os.getenv('BUNGIE_API_KEY')
BUNGIE_BASE_URL = 'https://www.bungie.net'

# Socket category hashes for weapon perk columns
# These identify what type of perk each socket is
SOCKET_CATEGORIES = {
    'barrels': 2685412949,      # Barrels
    'magazines': 2685412949,    # Same category, different index
    'perks': 4241085061,        # Weapon Perks (trait1, trait2)
    'origin': 1703496685,       # Origin Traits (if exists)
}

# Weapon bucket hashes (kinetic, energy, power)
WEAPON_BUCKETS = [1498876634, 2465295065, 953998645]

# Legendary tier
LEGENDARY_TIER = 5


def get_headers():
    """Get headers for Bungie API requests."""
    if not BUNGIE_API_KEY:
        raise ValueError("BUNGIE_API_KEY not found in .env file")
    return {
        'X-API-Key': BUNGIE_API_KEY
    }


def fetch_manifest_info():
    """Fetch manifest metadata from Bungie API."""
    print("Fetching manifest info...")
    resp = requests.get(
        f"{BUNGIE_BASE_URL}/Platform/Destiny2/Manifest/",
        headers=get_headers()
    )
    resp.raise_for_status()
    return resp.json()['Response']


def download_manifest_table(manifest_info, table_name):
    """Download a specific manifest table."""
    print(f"Downloading {table_name}...")

    # Get the content path for this table
    content_paths = manifest_info['jsonWorldComponentContentPaths']['en']
    if table_name not in content_paths:
        raise ValueError(f"Table {table_name} not found in manifest")

    table_path = content_paths[table_name]
    resp = requests.get(f"{BUNGIE_BASE_URL}{table_path}", headers=get_headers())
    resp.raise_for_status()

    data = resp.json()
    print(f"  Downloaded {len(data)} entries")
    return data


def extract_weapon_perk_pools(items, plug_sets, socket_types):
    """Extract perk pools for each legendary weapon."""
    print("\nExtracting weapon perk pools...")

    weapon_pools = {}
    weapon_count = 0

    for item_hash, item in items.items():
        # Filter for legendary weapons
        if item.get('inventory', {}).get('tierType') != LEGENDARY_TIER:
            continue
        if item.get('inventory', {}).get('bucketTypeHash') not in WEAPON_BUCKETS:
            continue

        # Must have sockets
        sockets = item.get('sockets', {})
        socket_entries = sockets.get('socketEntries', [])
        socket_categories = sockets.get('socketCategories', [])

        if not socket_entries:
            continue

        weapon_name = item.get('displayProperties', {}).get('name', 'Unknown')
        weapon_count += 1

        # Build perk pool for this weapon
        perk_pool = {
            'name': weapon_name,
            'barrels': [],
            'magazines': [],
            'trait1': [],
            'trait2': [],
            'origin': []
        }

        # Map socket indices to categories
        socket_category_map = {}
        for cat in socket_categories:
            cat_hash = cat.get('socketCategoryHash')
            for idx in cat.get('socketIndexes', []):
                socket_category_map[idx] = cat_hash

        # Track which trait column we're on
        trait_index = 0

        for idx, socket in enumerate(socket_entries):
            # Get plug set hash (random or reusable)
            plug_set_hash = socket.get('randomizedPlugSetHash') or socket.get('reusablePlugSetHash')
            if not plug_set_hash:
                continue

            # Get the plug set
            plug_set = plug_sets.get(str(plug_set_hash), {})
            plugs = plug_set.get('reusablePlugItems', [])

            # Get perk hashes from plug set
            perk_hashes = [p.get('plugItemHash') for p in plugs if p.get('plugItemHash')]

            if not perk_hashes:
                continue

            # Determine socket type by looking at the socket type hash
            socket_type_hash = socket.get('socketTypeHash')
            socket_type = socket_types.get(str(socket_type_hash), {})
            socket_category = socket_type.get('socketCategoryHash', 0)

            # Categorize based on socket index and category
            # Typically: 0=barrel, 1=magazine, 2=trait1, 3=trait2, 4+=origin/mods
            if idx == 0:
                perk_pool['barrels'] = perk_hashes
            elif idx == 1:
                perk_pool['magazines'] = perk_hashes
            elif idx == 2:
                perk_pool['trait1'] = perk_hashes
            elif idx == 3:
                perk_pool['trait2'] = perk_hashes
            elif idx == 4 and len(perk_hashes) <= 10:
                # Origin traits are usually in slot 4 with few options
                perk_pool['origin'] = perk_hashes

        # Only save if we found at least some perks
        if any([perk_pool['barrels'], perk_pool['magazines'],
                perk_pool['trait1'], perk_pool['trait2']]):
            weapon_pools[item_hash] = perk_pool

    print(f"  Extracted perk pools for {len(weapon_pools)} weapons")
    return weapon_pools


def build_perk_name_lookup(items):
    """Build a lookup from perk hash to name."""
    print("\nBuilding perk name lookup...")
    perk_names = {}

    for item_hash, item in items.items():
        # Check if it's a perk/mod (has plug category)
        if item.get('plug'):
            name = item.get('displayProperties', {}).get('name', '')
            if name:
                perk_names[int(item_hash)] = name

    print(f"  Found {len(perk_names)} perk names")
    return perk_names


def main():
    print("=" * 50)
    print("Bungie Manifest → Weapon Perk Pools")
    print("=" * 50)

    if not BUNGIE_API_KEY:
        print("\n❌ Error: BUNGIE_API_KEY not found in .env file")
        print("   Get your API key from https://www.bungie.net/en/Application")
        return

    try:
        # Fetch manifest info
        manifest_info = fetch_manifest_info()
        print(f"  Manifest version: {manifest_info['version']}")

        # Download required tables
        items = download_manifest_table(manifest_info, 'DestinyInventoryItemDefinition')
        plug_sets = download_manifest_table(manifest_info, 'DestinyPlugSetDefinition')
        socket_types = download_manifest_table(manifest_info, 'DestinySocketTypeDefinition')

        # Extract weapon perk pools
        weapon_pools = extract_weapon_perk_pools(items, plug_sets, socket_types)

        # Build perk name lookup (for debugging/reference)
        perk_names = build_perk_name_lookup(items)

        # Save weapon perk pools
        output_file = 'weapon_perk_pools.json'
        with open(output_file, 'w') as f:
            json.dump(weapon_pools, f, indent=2)
        print(f"\n✅ Saved weapon perk pools to {output_file}")

        # Save perk names (for reference)
        perk_names_file = 'perk_names.json'
        with open(perk_names_file, 'w') as f:
            json.dump(perk_names, f, indent=2)
        print(f"✅ Saved perk names to {perk_names_file}")

        # Show some stats
        print(f"\n📊 Stats:")
        print(f"   Weapons: {len(weapon_pools)}")
        print(f"   Perks: {len(perk_names)}")

        # Show a sample
        sample_hash = list(weapon_pools.keys())[0]
        sample = weapon_pools[sample_hash]
        print(f"\n📋 Sample ({sample['name']}):")
        print(f"   Barrels: {len(sample['barrels'])} options")
        print(f"   Magazines: {len(sample['magazines'])} options")
        print(f"   Trait 1: {len(sample['trait1'])} options")
        print(f"   Trait 2: {len(sample['trait2'])} options")

    except requests.exceptions.HTTPError as e:
        print(f"\n❌ HTTP Error: {e}")
        if e.response.status_code == 401:
            print("   Check your BUNGIE_API_KEY in .env file")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise


if __name__ == '__main__':
    main()
