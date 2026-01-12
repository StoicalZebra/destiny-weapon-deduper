#!/usr/bin/env python3
"""
Convert existing LittleLight JSON files to DIM wishlist format.
One-time migration script.
"""

import json
import os
import glob
import re
from itertools import product

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, 'output')

# Load perk names for human-readable notes
PERK_NAMES = {}
perk_names_path = os.path.join(SCRIPT_DIR, 'perk_names.json')
if os.path.exists(perk_names_path):
    with open(perk_names_path, 'r') as f:
        PERK_NAMES = json.load(f)

# Load weapon lookup and create reverse mapping (hash -> name)
WEAPON_NAMES = {}
weapon_lookup_path = os.path.join(SCRIPT_DIR, 'weapon_lookup.json')
if os.path.exists(weapon_lookup_path):
    with open(weapon_lookup_path, 'r') as f:
        weapon_lookup = json.load(f)
        # Reverse: hash -> name (prefer title case)
        for name, hash_val in weapon_lookup.items():
            # Store the more readable version (title case)
            existing = WEAPON_NAMES.get(hash_val, '')
            if not existing or name.replace('-', ' ').istitle():
                WEAPON_NAMES[hash_val] = name.replace('-', ' ').title()

# Weapon type lookup by hash (common weapons)
WEAPON_TYPES = {
    877384: 'Pulse Rifle',       # Martlet
    1323862250: 'Fusion Rifle',  # Riptide
    1419158093: 'Pulse Rifle',   # M-17 Fast Talker
    2023002233: 'Pulse Rifle',   # All Or Nothing
    1872906663: 'Hand Cannon',   # Modified B-7 Pistol
    2819552809: 'Sidearm',       # Compact Defender
}


def get_perk_name(hash_val):
    """Get perk name from hash."""
    return PERK_NAMES.get(str(hash_val), str(hash_val))


def get_weapon_name(hash_val):
    """Get weapon name from hash."""
    return WEAPON_NAMES.get(hash_val, f"Unknown ({hash_val})")


def get_weapon_type(hash_val):
    """Get weapon type from hash."""
    return WEAPON_TYPES.get(hash_val, 'Weapon')


def extract_video_info_from_md(json_path):
    """Extract video title and URL from accompanying markdown file."""
    # Find matching .md file (same timestamp prefix)
    base = os.path.basename(json_path).replace('.json', '')
    md_pattern = os.path.join(OUTPUT_DIR, f"{base}_*.md")
    md_files = glob.glob(md_pattern)

    video_title = None
    video_url = None

    if md_files:
        with open(md_files[0], 'r') as f:
            content = f.read()
            # Extract video title from markdown link: [Title](URL)
            match = re.search(r'\*\*Source:\*\* \[([^\]]+)\]\(([^)]+)\)', content)
            if match:
                video_title = match.group(1)
                video_url = match.group(2).split('&t=')[0]  # Remove timestamp

    return video_title, video_url


def convert_json_to_dim(json_path):
    """Convert a single JSON file to DIM format."""
    with open(json_path, 'r') as f:
        data = json.load(f)

    lines = []

    # Get weapon info from the first item
    first_item = data.get('data', [{}])[0] if data.get('data') else {}
    weapon_hash = first_item.get('hash')
    weapon_name = get_weapon_name(weapon_hash) if weapon_hash else 'Unknown'
    weapon_type = get_weapon_type(weapon_hash) if weapon_hash else 'Weapon'

    # Extract video info from markdown file
    video_title, video_url = extract_video_info_from_md(json_path)

    # Build title: "Weapon Name (Type)"
    title = f"{weapon_name} ({weapon_type})"

    # Build description: extracted from: "Video Title" at URL
    original_desc = data.get('description', '')
    if video_title and video_url:
        description = f'Extracted from: "{video_title}" at {video_url}'
    elif video_url:
        description = f'Extracted from: {video_url}'
    else:
        description = original_desc

    # Header
    lines.append(f"title:{title}")
    lines.append(f"description:{description}")
    lines.append("")

    for item in data.get('data', []):
        weapon_hash = item.get('hash')
        plugs = item.get('plugs', [[], [], [], []])
        tags = [t.lower() for t in item.get('tags', ['pve'])]
        description = item.get('description', '')

        # Truncate description for inline notes
        short_note = description[:100] + "..." if len(description) > 100 else description
        short_note = short_note.replace('\n', ' ').replace('|', '-')

        # Get perk names for block comment
        perk_names = []
        for col in plugs:
            if col:
                perk_names.extend([get_perk_name(h) for h in col])

        # Block comment
        if perk_names:
            lines.append(f"//notes:{', '.join(perk_names[:4])}")

        # Generate all perk combinations (cartesian product)
        # Each column in plugs is a list of hashes (OR logic)
        columns = []
        for col in plugs:
            if col:
                columns.append([(h,) for h in col])
            else:
                columns.append([(None,)])

        for combo in product(*columns):
            perk_hashes = [str(h[0]) for h in combo if h[0] is not None]

            if not perk_hashes:
                continue

            perks_str = ",".join(perk_hashes)
            tags_str = ",".join(tags) if tags else "pve"

            line = f"dimwishlist:item={weapon_hash}&perks={perks_str}#notes:{short_note}|tags:{tags_str}"
            lines.append(line)

        lines.append("")

    return "\n".join(lines)


def main():
    json_files = glob.glob(os.path.join(OUTPUT_DIR, "*.json"))

    if not json_files:
        print("No JSON files found in output directory")
        return

    print(f"Found {len(json_files)} JSON files to convert\n")

    for json_path in sorted(json_files):
        filename = os.path.basename(json_path)
        txt_filename = filename.replace('.json', '.txt')
        txt_path = os.path.join(OUTPUT_DIR, txt_filename)

        print(f"Converting: {filename} -> {txt_filename}")

        try:
            dim_content = convert_json_to_dim(json_path)

            with open(txt_path, 'w') as f:
                f.write(dim_content)

            # Count lines
            line_count = sum(1 for line in dim_content.split('\n') if line.startswith('dimwishlist:'))
            print(f"  ✅ Created {line_count} wishlist entries")

        except Exception as e:
            print(f"  ❌ Error: {e}")

    print(f"\n🎉 Conversion complete!")


if __name__ == "__main__":
    main()
