#!/usr/bin/env python3
"""
YouTube God Roll Agent
Extracts Destiny 2 god roll recommendations from YouTube videos.
Outputs D3-compatible JSON for import.
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

def analyze_transcript(text_content, video_title):
    """Use Gemini to extract god rolls from transcript."""
    print(f"   🧠 Analyzing: {video_title}...")

    prompt = GOD_ROLL_PROMPT + text_content[:30000]

    max_retries = 5
    base_wait = 15

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
        result = process.extractOne(name_lower, lookup_dict.keys(), scorer=fuzz.ratio)
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


def convert_to_littlelight_format(all_raw_rolls, wishlist_name, description):
    """Convert raw god rolls to LittleLight wishlist format.

    Args:
        all_raw_rolls: List of {'video_info': {...}, 'rolls': [...]} dicts
        wishlist_name: Name for the wishlist
        description: Description for the wishlist
    """
    data = []
    uncertain = []

    for item in all_raw_rolls:
        for roll in item['rolls']:
            weapon_name = roll.get('weapon', '')
            weapon_hash, exact_weapon = lookup_hash(weapon_name, WEAPON_LOOKUP)

            if not weapon_hash:
                uncertain.append(f"❓ Unknown weapon: '{weapon_name}'")
                continue

            if not exact_weapon:
                uncertain.append(f"⚠️ Fuzzy weapon match: '{weapon_name}'")

            # Build 4-column plugs array: [barrel, magazine, trait1, trait2]
            plugs = [[], [], [], []]

            # Column 0: Barrel
            for perk in (roll.get('barrel') or []):
                if perk and perk != 'null':
                    h, exact = lookup_hash(perk, PERK_LOOKUP)
                    if h:
                        plugs[0].append(h)
                        if not exact:
                            uncertain.append(f"⚠️ Fuzzy perk match: '{perk}'")
                    else:
                        uncertain.append(f"❓ Unknown perk: '{perk}'")

            # Column 1: Magazine
            for perk in (roll.get('magazine') or []):
                if perk and perk != 'null':
                    h, exact = lookup_hash(perk, PERK_LOOKUP)
                    if h:
                        plugs[1].append(h)
                        if not exact:
                            uncertain.append(f"⚠️ Fuzzy perk match: '{perk}'")
                    else:
                        uncertain.append(f"❓ Unknown perk: '{perk}'")

            # Column 2: Trait 1
            for perk in (roll.get('trait1') or []):
                if perk and perk != 'null':
                    h, exact = lookup_hash(perk, PERK_LOOKUP)
                    if h:
                        plugs[2].append(h)
                        if not exact:
                            uncertain.append(f"⚠️ Fuzzy perk match: '{perk}'")
                    else:
                        uncertain.append(f"❓ Unknown perk: '{perk}'")

            # Column 3: Trait 2
            for perk in (roll.get('trait2') or []):
                if perk and perk != 'null':
                    h, exact = lookup_hash(perk, PERK_LOOKUP)
                    if h:
                        plugs[3].append(h)
                        if not exact:
                            uncertain.append(f"⚠️ Fuzzy perk match: '{perk}'")
                    else:
                        uncertain.append(f"❓ Unknown perk: '{perk}'")

            # Build tags from mode
            mode = roll.get('mode', 'Both')
            tags = []
            if mode in ['PvE', 'Both']:
                tags.append('PvE')
            if mode in ['PvP', 'Both']:
                tags.append('PvP')

            # Only add if we have at least one perk
            if any(plugs):
                data.append({
                    "hash": weapon_hash,
                    "plugs": plugs,
                    "tags": tags
                })

    return {
        "name": wishlist_name,
        "description": description,
        "data": data
    }, uncertain


# --- MAIN EXECUTION ---
if __name__ == "__main__":
    print("=" * 50)
    print("YouTube God Roll Agent → LittleLight Import")
    print("=" * 50)

    # Check for lookup files
    if not PERK_LOOKUP or not WEAPON_LOOKUP:
        print("\n⚠️  Lookup files not found!")
        print("   Run: ./venv/bin/python download_manifest.py")
        print("   to generate perk_lookup.json and weapon_lookup.json")
        exit(1)

    print(f"\n📚 Loaded {len(PERK_LOOKUP)} perks, {len(WEAPON_LOOKUP)} weapons")
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
    json_filename = os.path.join(OUTPUT_DIR, f"God_Rolls_{timestamp}.json")
    markdown_filename = os.path.join(OUTPUT_DIR, f"God_Rolls_{timestamp}.md")

    print(f"\n📝 Output files:")
    print(f"   • {json_filename} (LittleLight import)")
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

    # Generate LittleLight format JSON
    ll_export, ll_uncertain = convert_to_littlelight_format(
        all_raw_rolls,
        wishlist_name="YouTube God Rolls",
        description=f"Extracted from: {video_link}"
    )
    all_uncertain.extend(ll_uncertain)

    with open(json_filename, 'w', encoding='utf-8') as f:
        json.dump(ll_export, f, indent=2)

    print(f"\n✅ Saved {len(ll_export['data'])} god rolls to {json_filename}")

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
    print(f"\n🎉 Done! Import {json_filename} into LittleLight.")
