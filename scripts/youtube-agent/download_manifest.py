#!/usr/bin/env python3
"""
Download Destiny 2 manifest and extract perk/weapon name → hash lookups.
Run this occasionally when new perks/weapons are added to the game.
"""

import json
import requests
import zipfile
import sqlite3
import io
import os

BUNGIE_ROOT = "https://www.bungie.net"
MANIFEST_URL = f"{BUNGIE_ROOT}/Platform/Destiny2/Manifest/"

def get_manifest_url():
    """Get the URL to the manifest SQLite database."""
    print("📡 Fetching manifest info...")
    response = requests.get(MANIFEST_URL)
    response.raise_for_status()
    data = response.json()

    # Get English content path
    content_path = data['Response']['mobileWorldContentPaths']['en']
    return f"{BUNGIE_ROOT}{content_path}"

def download_and_extract_manifest(url):
    """Download the manifest zip and extract the SQLite database."""
    print(f"📥 Downloading manifest...")
    response = requests.get(url)
    response.raise_for_status()

    # The .content file is actually a ZIP containing SQLite
    print("📦 Extracting database...")
    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        # There's only one file in the zip
        filename = zf.namelist()[0]
        return zf.read(filename)

def extract_lookups(db_bytes):
    """Extract perk and weapon name → hash mappings from the manifest."""
    # Write to temp file for SQLite
    temp_db = "temp_manifest.db"
    with open(temp_db, 'wb') as f:
        f.write(db_bytes)

    try:
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()

        # Get all inventory items
        cursor.execute("SELECT json FROM DestinyInventoryItemDefinition")
        rows = cursor.fetchall()

        perk_lookup = {}
        weapon_lookup = {}

        print(f"🔍 Processing {len(rows)} items...")

        for row in rows:
            item = json.loads(row[0])

            # Get display name
            name = item.get('displayProperties', {}).get('name', '')
            if not name:
                continue

            item_hash = item.get('hash')
            item_type = item.get('itemType', 0)
            item_sub_type = item.get('itemSubType', 0)

            # Lowercase for lookup
            name_lower = name.lower()

            # itemType 19 = Mod (includes perks)
            # Also catch itemType 2 (Armor) mods and perks
            if item_type == 19:
                perk_lookup[name_lower] = item_hash

            # itemType 3 = Weapon
            if item_type == 3:
                weapon_lookup[name_lower] = item_hash

        conn.close()
        return perk_lookup, weapon_lookup

    finally:
        # Cleanup temp file
        if os.path.exists(temp_db):
            os.remove(temp_db)

def save_lookups(perk_lookup, weapon_lookup):
    """Save lookups to JSON files."""
    script_dir = os.path.dirname(os.path.abspath(__file__))

    perk_path = os.path.join(script_dir, 'perk_lookup.json')
    weapon_path = os.path.join(script_dir, 'weapon_lookup.json')

    with open(perk_path, 'w', encoding='utf-8') as f:
        json.dump(perk_lookup, f, indent=2)
    print(f"✅ Saved {len(perk_lookup)} perks to perk_lookup.json")

    with open(weapon_path, 'w', encoding='utf-8') as f:
        json.dump(weapon_lookup, f, indent=2)
    print(f"✅ Saved {len(weapon_lookup)} weapons to weapon_lookup.json")

def main():
    print("=" * 50)
    print("Destiny 2 Manifest Downloader")
    print("=" * 50)

    try:
        manifest_url = get_manifest_url()
        db_bytes = download_and_extract_manifest(manifest_url)
        perk_lookup, weapon_lookup = extract_lookups(db_bytes)
        save_lookups(perk_lookup, weapon_lookup)

        print("\n🎉 Done! Lookup files are ready.")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise

if __name__ == "__main__":
    main()
