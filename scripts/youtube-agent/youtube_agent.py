#!/usr/bin/env python3
"""
YouTube God Roll Agent
Extracts Destiny 2 god roll recommendations from YouTube videos.
Outputs DIM-compatible wishlist format (.txt) for import into DIM or D3 app.
"""

import os
import time
import glob
import json
import re
from datetime import datetime
from dotenv import load_dotenv

from google import genai
import yt_dlp

# Optional: fuzzy matching for perk names
try:
    from rapidfuzz import fuzz, process
    HAS_FUZZY = True
except ImportError:
    HAS_FUZZY = False

# Load Environment Variables
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("❌ No API Key found! Check your .env file.")

client = genai.Client(api_key=API_KEY)

# --- CONFIGURATION ---
MODEL_NAME = "gemini-3-flash-preview"  # Best reasoning model
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, 'output')

# --- LOOKUP DATA ---
def load_lookup(filename):
    """Load a JSON lookup file."""
    path = os.path.join(SCRIPT_DIR, filename)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

PERK_LOOKUP = load_lookup('perk_lookup.json')
WEAPON_LOOKUP = load_lookup('weapon_lookup.json')
WEAPON_PERK_POOLS = load_lookup('weapon_perk_pools.json')
PERK_NAMES = load_lookup('perk_names.json')

# --- PROMPT ---
GOD_ROLL_PROMPT = """
You are a Destiny 2 expert analyzing a video transcript for god roll weapon recommendations.

DESTINY 2 WEAPON STRUCTURE:
Weapons have distinct perk columns:
- Column 1: Barrels/Sights (affects stats like stability, range, handling)
- Column 2: Magazines/Batteries (affects ammo, reload, stats)
- Column 3: Trait 1 (first main perk - e.g., Outlaw, Subsistence, Slideshot)
- Column 4: Trait 2 (second main perk - e.g., Kill Clip, Rampage, Headstone)
- Origin Trait: Weapon-specific perk (e.g., Skulking Wolf, Vanguard's Vindication)
- Masterwork: Stat boost (Range, Stability, Handling, Reload Speed)

OUTPUT FORMAT - Return ONLY valid JSON, no markdown:
[
  {
    "weapon": "Exact weapon name",
    "mode": "PvE" | "PvP" | "Both",
    "barrel": ["Perk Name"],
    "magazine": ["Perk Name"],
    "trait1": ["Perk Name", "Alternative Perk"],
    "trait2": ["Perk Name"],
    "masterwork": "Stat Name or null",
    "originTrait": "Perk Name or null",
    "reasoning": "Why these perks synergize and what playstyle they enable",
    "timestamp": "MM:SS"
  }
]

RULES:
1. Use EXACT Destiny 2 perk names with proper capitalization
2. Include "The" prefix for weapons that have it (e.g., "The Martlet", "The Immortal")
3. If creator says "X or Y" for a column, put both in that column's array as alternatives
4. Extract recommendations even if only trait1 OR trait2 is mentioned - partial rolls are OK
5. Separate PvE and PvP as different entries ONLY if they have different perks
6. The "reasoning" field must explain WHY these perks work together, not just restate them
7. Auto-captions have errors - use your Destiny 2 knowledge to correct obvious mishearings
   (e.g., "vorpal" not "vorp all", "Kill Clip" not "kill clip")
8. If a column isn't mentioned, use null (don't guess)
9. If no god rolls are discussed, return: []
10. IMPORTANT: Extract only the PRIMARY weapon being recommended, NOT comparison weapons.
    Creators often say "this is better than X" or "unlike Y" - ignore X and Y, focus on the main subject.
11. Use the EXACT weapon name as spoken in the transcript. Do not substitute similar-sounding names.
    For example, if they say "Modified B7 Pistol", use that exact name - not "Exigent B7".

EXAMPLE OUTPUT:
[
  {
    "weapon": "Solemn Remembrance",
    "mode": "PvE",
    "barrel": ["Arrowhead Brake"],
    "magazine": ["Tactical Mag"],
    "trait1": ["Headstone"],
    "trait2": ["Firefly"],
    "masterwork": "Stability",
    "originTrait": null,
    "reasoning": "Headstone creates a Stasis crystal on precision kills, and Firefly's explosion instantly shatters it, causing chain reaction damage for exceptional add clear.",
    "timestamp": "01:42"
  }
]

TRANSCRIPT:
"""

# --- TWO-PASS PROMPTS ---
WEAPON_EXTRACT_PROMPT = """
You are a Destiny 2 expert. Analyze this video transcript and extract ONLY the weapon names being recommended.

RULES:
1. Extract only the PRIMARY weapon(s) being recommended, NOT comparison weapons
2. Creators often say "this is better than X" - ignore X, extract only the main weapon
3. Include "The" prefix if the weapon has it (e.g., "The Martlet")
4. Use the EXACT weapon name as spoken
5. Return weapon names and their recommended mode (PvE/PvP/Both)

OUTPUT FORMAT - Return ONLY valid JSON:
[
  {"weapon": "Exact Weapon Name", "mode": "PvE" | "PvP" | "Both"}
]

If no weapons are recommended, return: []

TRANSCRIPT:
"""

CONSTRAINED_ROLL_PROMPT = """
You are a Destiny 2 expert analyzing a video transcript for god roll recommendations.

WEAPON: {weapon_name}
MODE: {mode}

VALID PERKS FOR THIS WEAPON (only use perks from these lists):
- Barrels: {barrels}
- Magazines: {magazines}
- Trait 1: {trait1}
- Trait 2: {trait2}

OUTPUT FORMAT - Return ONLY valid JSON, no markdown:
{{
  "weapon": "{weapon_name}",
  "mode": "{mode}",
  "barrel": ["Perk Name"] or null,
  "magazine": ["Perk Name"] or null,
  "trait1": ["Perk Name", "Alternative"],
  "trait2": ["Perk Name"],
  "masterwork": "Stat Name" or null,
  "originTrait": "Perk Name" or null,
  "reasoning": "Why these perks synergize",
  "timestamp": "MM:SS"
}}

RULES:
1. ONLY use perks from the VALID PERKS lists above
2. If a perk mentioned in the video is NOT in the valid list, skip it
3. If creator says "X or Y", include both if they're in the valid list
4. Extract the timestamp where this roll is discussed
5. Explain WHY these perks work together in the reasoning field

TRANSCRIPT:
"""


def get_valid_perks_for_weapon(weapon_name):
    """Get valid perk names for a weapon from the perk pool data."""
    if not WEAPON_PERK_POOLS or not PERK_NAMES:
        return None

    # Find weapon in perk pools by name (case-insensitive)
    weapon_name_lower = weapon_name.lower().strip()

    for weapon_hash, pool in WEAPON_PERK_POOLS.items():
        if pool.get('name', '').lower() == weapon_name_lower:
            # Convert perk hashes to names
            def hashes_to_names(hash_list):
                names = []
                for h in hash_list:
                    name = PERK_NAMES.get(str(h)) or PERK_NAMES.get(h)
                    if name:
                        names.append(name)
                return names

            return {
                'barrels': hashes_to_names(pool.get('barrels', [])),
                'magazines': hashes_to_names(pool.get('magazines', [])),
                'trait1': hashes_to_names(pool.get('trait1', [])),
                'trait2': hashes_to_names(pool.get('trait2', [])),
                'origin': hashes_to_names(pool.get('origin', []))
            }

    # Try fuzzy match if exact match fails
    if HAS_FUZZY:
        pool_names = {pool['name'].lower(): (h, pool) for h, pool in WEAPON_PERK_POOLS.items()}
        result = process.extractOne(weapon_name_lower, pool_names.keys(), scorer=fuzz.token_sort_ratio)
        if result and result[1] >= 75:
            matched_name = result[0]
            weapon_hash, pool = pool_names[matched_name]

            def hashes_to_names(hash_list):
                names = []
                for h in hash_list:
                    name = PERK_NAMES.get(str(h)) or PERK_NAMES.get(h)
                    if name:
                        names.append(name)
                return names

            return {
                'barrels': hashes_to_names(pool.get('barrels', [])),
                'magazines': hashes_to_names(pool.get('magazines', [])),
                'trait1': hashes_to_names(pool.get('trait1', [])),
                'trait2': hashes_to_names(pool.get('trait2', [])),
                'origin': hashes_to_names(pool.get('origin', []))
            }

    return None


def is_playlist_url(url):
    """Check if URL is a playlist or single video."""
    return 'list=' in url


def get_single_video(video_url):
    """Get video info for a single video URL."""
    print(f"\n🔍 Fetching video info...")
    metadata = get_video_metadata(video_url)
    if metadata:
        # Extract video ID from URL
        video_id = metadata.get('id', '')
        if not video_id:
            # Try to parse from URL
            if 'v=' in video_url:
                video_id = video_url.split('v=')[1].split('&')[0]
            elif 'youtu.be/' in video_url:
                video_id = video_url.split('youtu.be/')[1].split('?')[0]

        video_data = [{
            'title': metadata.get('title', 'Unknown Video'),
            'url': f"https://www.youtube.com/watch?v={video_id}" if video_id else video_url,
            'id': video_id,
            'channel': metadata.get('channel', 'Unknown'),
        }]
        print(f"✅ Found: {video_data[0]['title']}")
        return video_data
    return []


def get_playlist_videos(playlist_url):
    """Extract video info from a YouTube playlist."""
    print(f"\n🔍 Scanning playlist...")
    ydl_opts = {
        'extract_flat': 'in_playlist',
        'quiet': True,
        'ignoreerrors': True,
    }
    video_data = []
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(playlist_url, download=False)
        if 'entries' in info:
            for entry in info['entries']:
                video_id = entry.get('id')
                video_data.append({
                    'title': entry.get('title', 'Unknown Video'),
                    'url': entry.get('url') or f"https://www.youtube.com/watch?v={video_id}",
                    'id': video_id,
                    'channel': entry.get('channel') or entry.get('uploader') or 'Unknown',
                })
    print(f"✅ Found {len(video_data)} videos.")
    return video_data


def get_video_metadata(video_url):
    """Get full video metadata including channel name."""
    ydl_opts = {
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            return {
                'channel': info.get('channel') or info.get('uploader') or 'Unknown',
                'title': info.get('title', 'Unknown Video'),
                'id': info.get('id'),
            }
    except Exception:
        return None


def timestamp_to_seconds(timestamp_str):
    """Convert MM:SS or HH:MM:SS to seconds."""
    if not timestamp_str:
        return None
    parts = timestamp_str.strip().split(':')
    try:
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except ValueError:
        pass
    return None


def build_timestamped_url(video_id, timestamp_str):
    """Build a YouTube URL with timestamp parameter."""
    base_url = f"https://www.youtube.com/watch?v={video_id}"
    seconds = timestamp_to_seconds(timestamp_str)
    if seconds:
        return f"{base_url}&t={seconds}s"
    return base_url

def clean_vtt_transcript(vtt_content):
    """Clean VTT subtitle format to plain text."""
    lines = vtt_content.split('\n')
    seen_lines = set()
    clean_lines = []

    for line in lines:
        # Skip VTT header, timing lines, and empty lines
        if line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
            continue
        if '-->' in line:  # Timing line
            continue
        if not line.strip():
            continue
        if line.strip().startswith('NOTE'):
            continue

        # Remove HTML-like tags (e.g., <c>, </c>, <00:00:01.234>)
        clean_line = re.sub(r'<[^>]+>', '', line)
        clean_line = clean_line.strip()

        # Skip duplicate lines (VTT often repeats lines)
        if clean_line and clean_line not in seen_lines:
            seen_lines.add(clean_line)
            clean_lines.append(clean_line)

    return ' '.join(clean_lines)


def get_transcript_with_ytdlp(video_url):
    """Download subtitles for a video using yt-dlp."""
    temp_filename = "temp_subs"

    ydl_opts = {
        'skip_download': True,
        'writesub': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en'],
        'subtitlesformat': 'vtt',
        'outtmpl': temp_filename,
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])

        files = glob.glob(f"{temp_filename}*.vtt")
        if not files:
            return None

        with open(files[0], 'r', encoding='utf-8') as f:
            vtt_content = f.read()

        # Cleanup temp files
        for f in files:
            try:
                os.remove(f)
            except:
                pass

        # Clean VTT to plain text
        return clean_vtt_transcript(vtt_content)
    except Exception:
        return None

def call_gemini(prompt, max_retries=5, base_wait=15):
    """Call Gemini API with retry logic."""
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt
            )
            return response.text
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                wait_time = base_wait * (attempt + 1)
                print(f"      ⏳ Rate limited. Waiting {wait_time}s...")
                time.sleep(wait_time)
            elif "404" in error_str:
                return f"❌ Model '{MODEL_NAME}' not found. Check model name."
            else:
                return f"⚠️ Error: {e}"
    return "❌ Failed after multiple retries."


def analyze_transcript(text_content, video_title):
    """Use Gemini to extract god rolls from transcript using two-pass validation."""
    print(f"   🧠 Analyzing: {video_title}...")

    transcript = text_content[:30000]

    # Check if we have perk pool data for two-pass validation
    if not WEAPON_PERK_POOLS or not PERK_NAMES:
        print("      ℹ️  No perk pool data - using single-pass extraction")
        prompt = GOD_ROLL_PROMPT + transcript
        return call_gemini(prompt)

    # === PASS 1: Extract weapon names ===
    print("      📋 Pass 1: Extracting weapons...")
    pass1_prompt = WEAPON_EXTRACT_PROMPT + transcript
    pass1_response = call_gemini(pass1_prompt)
    weapons = parse_gemini_response(pass1_response)

    if not weapons:
        print("      ⚠️  No weapons found in pass 1, falling back to single-pass")
        prompt = GOD_ROLL_PROMPT + transcript
        return call_gemini(prompt)

    print(f"      ✅ Found {len(weapons)} weapon(s): {', '.join(w.get('weapon', '?') for w in weapons)}")

    # === PASS 2: Extract constrained rolls for each weapon ===
    all_rolls = []

    for weapon_info in weapons:
        weapon_name = weapon_info.get('weapon', '')
        mode = weapon_info.get('mode', 'Both')

        if not weapon_name:
            continue

        # Get valid perks for this weapon
        valid_perks = get_valid_perks_for_weapon(weapon_name)

        if not valid_perks:
            print(f"      ⚠️  No perk pool for '{weapon_name}', using unconstrained extraction")
            # Fall back to original prompt for this weapon
            prompt = GOD_ROLL_PROMPT + transcript
            response = call_gemini(prompt)
            rolls = parse_gemini_response(response)
            if rolls:
                # Filter to just this weapon
                for roll in rolls:
                    if roll.get('weapon', '').lower() == weapon_name.lower():
                        all_rolls.append(roll)
            continue

        print(f"      🎯 Pass 2: Extracting {weapon_name} ({mode}) with {len(valid_perks['trait1'])} trait1, {len(valid_perks['trait2'])} trait2 options...")

        # Build constrained prompt
        pass2_prompt = CONSTRAINED_ROLL_PROMPT.format(
            weapon_name=weapon_name,
            mode=mode,
            barrels=', '.join(valid_perks['barrels'][:20]) if valid_perks['barrels'] else 'N/A',
            magazines=', '.join(valid_perks['magazines'][:20]) if valid_perks['magazines'] else 'N/A',
            trait1=', '.join(valid_perks['trait1'][:20]) if valid_perks['trait1'] else 'N/A',
            trait2=', '.join(valid_perks['trait2'][:20]) if valid_perks['trait2'] else 'N/A'
        ) + transcript

        pass2_response = call_gemini(pass2_prompt)
        roll = parse_gemini_response(pass2_response)

        if roll:
            # Handle both single roll (dict) and multiple rolls (list)
            if isinstance(roll, dict):
                all_rolls.append(roll)
            elif isinstance(roll, list):
                all_rolls.extend(roll)

    if all_rolls:
        return json.dumps(all_rolls)
    else:
        # Fall back to original single-pass if two-pass yielded nothing
        print("      ⚠️  Two-pass yielded no results, falling back to single-pass")
        prompt = GOD_ROLL_PROMPT + transcript
        return call_gemini(prompt)

def parse_gemini_response(response_text):
    """Parse JSON from Gemini response, handling markdown code blocks."""
    # Strip markdown code blocks if present
    text = response_text.strip()
    if text.startswith('```'):
        # Remove ```json and ``` markers
        text = re.sub(r'^```json?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None

def lookup_hash(name, lookup_dict, threshold=75):
    """Look up a hash by name, with optional fuzzy matching."""
    if not name:
        return None, False

    name_lower = name.lower().strip()

    # Exact match first
    if name_lower in lookup_dict:
        return lookup_dict[name_lower], True

    # Fuzzy match if available
    if HAS_FUZZY and lookup_dict:
        result = process.extractOne(name_lower, lookup_dict.keys(), scorer=fuzz.token_sort_ratio)
        if result and result[1] >= threshold:
            matched_name = result[0]
            return lookup_dict[matched_name], False  # False = fuzzy match

    return None, False

def generate_readable_markdown(all_raw_rolls):
    """Generate human-readable markdown from raw god roll data."""
    lines = []

    # Group by weapon
    weapons = {}
    for item in all_raw_rolls:
        video_info = item['video_info']
        for roll in item['rolls']:
            weapon_name = roll.get('weapon', 'Unknown')
            if weapon_name not in weapons:
                weapons[weapon_name] = []
            weapons[weapon_name].append({
                'roll': roll,
                'video': video_info
            })

    # Sort weapons alphabetically
    for weapon_name in sorted(weapons.keys()):
        lines.append(f"## {weapon_name}\n")

        for entry in weapons[weapon_name]:
            roll = entry['roll']
            video = entry['video']

            mode = roll.get('mode', 'Unknown')
            lines.append(f"### {mode} Roll\n")

            # Perks table
            lines.append("| Column | Perks |")
            lines.append("|--------|-------|")

            if roll.get('barrel'):
                perks = roll['barrel'] if isinstance(roll['barrel'], list) else [roll['barrel']]
                perks = [p for p in perks if p]
                if perks:
                    lines.append(f"| Barrel | {', '.join(perks)} |")

            if roll.get('magazine'):
                perks = roll['magazine'] if isinstance(roll['magazine'], list) else [roll['magazine']]
                perks = [p for p in perks if p]
                if perks:
                    lines.append(f"| Magazine | {', '.join(perks)} |")

            if roll.get('trait1'):
                perks = roll['trait1'] if isinstance(roll['trait1'], list) else [roll['trait1']]
                perks = [p for p in perks if p]
                if perks:
                    lines.append(f"| Trait 1 | {', '.join(perks)} |")

            if roll.get('trait2'):
                perks = roll['trait2'] if isinstance(roll['trait2'], list) else [roll['trait2']]
                perks = [p for p in perks if p]
                if perks:
                    lines.append(f"| Trait 2 | {', '.join(perks)} |")

            if roll.get('originTrait'):
                lines.append(f"| Origin | {roll['originTrait']} |")

            if roll.get('masterwork'):
                lines.append(f"| Masterwork | {roll['masterwork']} |")

            lines.append("")

            # Reasoning
            if roll.get('reasoning'):
                lines.append(f"**Why:** {roll['reasoning']}\n")

            # Source
            timestamp = roll.get('timestamp', '')
            video_title = video.get('title', '')
            video_id = video.get('id', '')
            channel = video.get('channel', '')

            if video_id and timestamp:
                seconds = timestamp_to_seconds(timestamp)
                url = f"https://www.youtube.com/watch?v={video_id}&t={seconds}s" if seconds else f"https://www.youtube.com/watch?v={video_id}"
                lines.append(f"**Source:** [{video_title}]({url}) by {channel} @ {timestamp}\n")
            elif video_title:
                lines.append(f"**Source:** {video_title} by {channel}\n")

            lines.append("---\n")

    return "\n".join(lines)


def convert_to_dim_format(all_raw_rolls, wishlist_name, description):
    """Convert raw god rolls to DIM wishlist format (.txt).

    DIM format generates one line per perk combination. If a roll has multiple
    perks in a column (OR logic), we generate separate dimwishlist lines for each.

    Args:
        all_raw_rolls: List of {'video_info': {...}, 'rolls': [...]} dicts
        wishlist_name: Name for the wishlist
        description: Description for the wishlist

    Returns:
        tuple: (dim_text_content, uncertain_items_list)
    """
    from itertools import product

    lines = []
    uncertain = []

    # Header
    lines.append(f"title:{wishlist_name}")
    lines.append(f"description:{description}")
    lines.append("")

    for item in all_raw_rolls:
        video_info = item.get('video_info', {})
        video_title = video_info.get('title', '')

        for roll in item['rolls']:
            weapon_name = roll.get('weapon', '')
            weapon_hash, exact_weapon = lookup_hash(weapon_name, WEAPON_LOOKUP)

            if not weapon_hash:
                uncertain.append(f"❓ Unknown weapon: '{weapon_name}'")
                continue

            if not exact_weapon:
                uncertain.append(f"⚠️ Fuzzy weapon match: '{weapon_name}'")

            # Collect perk hashes for each column
            columns = []  # List of lists of (hash, name) tuples

            for column_key in ['barrel', 'magazine', 'trait1', 'trait2']:
                column_perks = []
                for perk in (roll.get(column_key) or []):
                    if perk and perk != 'null':
                        h, exact = lookup_hash(perk, PERK_LOOKUP)
                        if h:
                            column_perks.append((h, perk))
                            if not exact:
                                uncertain.append(f"⚠️ Fuzzy perk match: '{perk}'")
                        else:
                            uncertain.append(f"❓ Unknown perk: '{perk}'")
                columns.append(column_perks if column_perks else [(None, None)])

            # Build tags from mode (lowercase for DIM)
            mode = roll.get('mode', 'Both')
            tags = []
            if mode in ['PvE', 'Both']:
                tags.append('pve')
            if mode in ['PvP', 'Both']:
                tags.append('pvp')

            # Build reasoning/notes
            reasoning = roll.get('reasoning', '')
            timestamp = roll.get('timestamp', '')

            # Create a short note (truncated reasoning)
            short_note = reasoning[:100] + "..." if len(reasoning) > 100 else reasoning
            short_note = short_note.replace('\n', ' ').replace('|', '-')

            # Block comment with full context
            block_comment = f"//notes:{weapon_name} - {mode}"
            if timestamp:
                block_comment += f" @ {timestamp}"
            lines.append(block_comment)

            # Generate cartesian product of all perk combinations
            for combo in product(*columns):
                # Filter out None entries and collect hashes
                perk_hashes = [str(h) for h, name in combo if h is not None]

                if not perk_hashes:
                    continue

                # Build the dimwishlist line
                perks_str = ",".join(perk_hashes)
                tags_str = ",".join(tags) if tags else "pve"

                line = f"dimwishlist:item={weapon_hash}&perks={perks_str}#notes:{short_note}|tags:{tags_str}"
                lines.append(line)

            lines.append("")  # Blank line between rolls

    return "\n".join(lines), uncertain


# --- MAIN EXECUTION ---
if __name__ == "__main__":
    print("=" * 50)
    print("YouTube God Roll Agent → DIM Wishlist Format")
    print("=" * 50)

    # Check for lookup files
    if not PERK_LOOKUP or not WEAPON_LOOKUP:
        print("\n⚠️  Lookup files not found!")
        print("   Run: ./venv/bin/python download_manifest.py")
        print("   to generate perk_lookup.json and weapon_lookup.json")
        exit(1)

    print(f"\n📚 Loaded {len(PERK_LOOKUP)} perks, {len(WEAPON_LOOKUP)} weapons")
    if WEAPON_PERK_POOLS:
        print(f"✅ Two-pass validation enabled ({len(WEAPON_PERK_POOLS)} weapon perk pools)")
    else:
        print("⚠️  Two-pass validation disabled (run fetch_weapon_perks.py to enable)")
    if HAS_FUZZY:
        print("✅ Fuzzy matching enabled (rapidfuzz)")
    else:
        print("⚠️  Fuzzy matching disabled (install rapidfuzz for better matching)")

    video_link = input("\n🔗 Paste YouTube URL (video or playlist): ").strip()

    # Detect single video vs playlist
    if is_playlist_url(video_link):
        start_input = input("▶️  Start at video # (Press Enter for 1): ").strip()
        start_index = int(start_input) - 1 if start_input else 0
        videos = get_playlist_videos(video_link)
    else:
        start_index = 0
        videos = get_single_video(video_link)

    if not videos:
        print("❌ No videos found!")
        exit(1)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    dim_filename = os.path.join(OUTPUT_DIR, f"God_Rolls_{timestamp}.txt")
    markdown_filename = os.path.join(OUTPUT_DIR, f"God_Rolls_{timestamp}.md")

    print(f"\n📝 Output files:")
    print(f"   • {dim_filename} (DIM wishlist format)")
    print(f"   • {markdown_filename} (human readable)")
    print(f"🤖 Model: {MODEL_NAME}")
    print("-" * 50)

    all_uncertain = []
    all_raw_rolls = []  # For markdown and LittleLight export

    for i, video in enumerate(videos):
        if i < start_index:
            continue

        title = video['title']
        url = video['url']
        video_id = video.get('id', '')
        channel = video.get('channel', '')

        print(f"\n[{i+1}/{len(videos)}] {title}")

        # If channel is missing from playlist data, fetch full metadata
        if not channel or channel == 'Unknown':
            print(f"   📡 Fetching video metadata...")
            metadata = get_video_metadata(url)
            if metadata:
                channel = metadata.get('channel', 'Unknown')
                if not video_id:
                    video_id = metadata.get('id', '')

        if channel and channel != 'Unknown':
            print(f"   👤 Channel: {channel}")

        transcript = get_transcript_with_ytdlp(url)

        if not transcript:
            print(f"   ❌ No subtitles found")
            all_uncertain.append(f"\n## {title}\n❌ No subtitles available")
            continue

        raw_response = analyze_transcript(transcript, title)

        if raw_response.startswith("❌") or raw_response.startswith("⚠️"):
            print(f"   {raw_response}")
            all_uncertain.append(f"\n## {title}\n{raw_response}")
            continue

        god_rolls = parse_gemini_response(raw_response)

        if god_rolls is None:
            print(f"   ⚠️ Failed to parse JSON response")
            all_uncertain.append(f"\n## {title}\n⚠️ Failed to parse: {raw_response[:200]}...")
            continue

        if not god_rolls:
            print(f"   📭 No god rolls found in video")
            continue

        print(f"   ✅ Found {len(god_rolls)} god roll(s)")

        # Build video info
        video_info = {
            'title': title,
            'id': video_id,
            'channel': channel,
            'url': url,
        }

        # Store raw rolls for markdown and LittleLight export
        all_raw_rolls.append({
            'video_info': video_info,
            'rolls': god_rolls
        })

        # Rate limit protection
        time.sleep(10)

    # --- FINAL SUMMARY ---

    # Generate DIM wishlist format
    dim_content, dim_uncertain = convert_to_dim_format(
        all_raw_rolls,
        wishlist_name="YouTube God Rolls",
        description=f"Extracted from: {video_link}"
    )
    all_uncertain.extend(dim_uncertain)

    with open(dim_filename, 'w', encoding='utf-8') as f:
        f.write(dim_content)

    # Count dimwishlist lines
    dim_line_count = sum(1 for line in dim_content.split('\n') if line.startswith('dimwishlist:'))
    print(f"\n✅ Saved {dim_line_count} wishlist entries to {dim_filename}")

    # Human-readable markdown (with review section at bottom)
    with open(markdown_filename, 'w', encoding='utf-8') as f:
        f.write(f"# God Roll Recommendations\n\n")
        f.write(f"Generated: {timestamp}\n")
        f.write(f"Source: {video_link}\n\n")
        f.write(generate_readable_markdown(all_raw_rolls))

        # Add review/warnings section at bottom
        f.write("\n---\n\n")
        if all_uncertain:
            f.write("## ⚠️ Items Needing Review\n\n")
            f.write("\n".join(all_uncertain))
            f.write("\n")
        else:
            f.write("## ✅ All items matched successfully!\n")

    print(f"📖 Markdown: {markdown_filename}")
    print(f"\n🎉 Done! Import {dim_filename} into DIM or D3 app.")
