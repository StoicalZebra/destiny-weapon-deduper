#!/usr/bin/env python3
"""
Convert existing LittleLight JSON files to DIM wishlist format.
One-time migration script.
"""

import json
import os
import glob
from itertools import product

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, 'output')

# Load perk names for human-readable notes
PERK_NAMES = {}
perk_names_path = os.path.join(SCRIPT_DIR, 'perk_names.json')
if os.path.exists(perk_names_path):
    with open(perk_names_path, 'r') as f:
        PERK_NAMES = json.load(f)


def get_perk_name(hash_val):
    """Get perk name from hash."""
    return PERK_NAMES.get(str(hash_val), str(hash_val))


def convert_json_to_dim(json_path):
    """Convert a single JSON file to DIM format."""
    with open(json_path, 'r') as f:
        data = json.load(f)

    lines = []

    # Header
    lines.append(f"title:{data.get('name', 'YouTube God Rolls')}")
    lines.append(f"description:{data.get('description', '')}")
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
