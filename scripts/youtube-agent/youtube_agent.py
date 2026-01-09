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
import uuid
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
Analyze this Destiny 2 video transcript and extract god roll weapon recommendations.

OUTPUT FORMAT - Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "weapon": "Exact weapon name as shown in game",
    "mode": "PvE" or "PvP" or "Both",
    "perks": ["Perk Name 1", "Perk Name 2", "Perk Name 3"],
    "notes": "Any relevant context from the video",
    "timestamp": "MM:SS"
  }
]

RULES:
1. Use EXACT Destiny 2 perk names with proper capitalization (e.g., "Kill Clip", "Slideshot", "Vorpal Weapon")
2. Include ALL perks mentioned for each roll (barrels, magazines, traits)
3. If the creator says "or" between perks, include all options in the perks array
4. Separate PvE and PvP rolls as different entries if they have different perks
5. If no god rolls are discussed in the video, return: []
6. Output ONLY valid JSON - no markdown code blocks, no text before or after

TRANSCRIPT:
"""

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
            content = f.read()

        # Cleanup temp files
        for f in files:
            try:
                os.remove(f)
            except:
                pass

        return content
    except Exception as e:
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

def lookup_hash(name, lookup_dict, threshold=80):
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

def convert_to_d3_format(god_rolls, video_info):
    """Convert parsed god rolls to D3 import format.

    Args:
        god_rolls: List of god roll dicts from Gemini
        video_info: Dict with 'title', 'id', 'channel', 'url' keys
    """
    results = []
    uncertain = []

    video_title = video_info.get('title', 'Unknown Video')
    video_id = video_info.get('id', '')
    video_channel = video_info.get('channel', 'Unknown')
    video_url = video_info.get('url', '')

    for roll in god_rolls:
        weapon_name = roll.get('weapon', '')
        weapon_hash, exact_weapon = lookup_hash(weapon_name, WEAPON_LOOKUP)

        if not weapon_hash:
            uncertain.append(f"❓ Unknown weapon: '{weapon_name}'")
            continue

        if not exact_weapon:
            uncertain.append(f"⚠️ Fuzzy weapon match: '{weapon_name}'")

        # Build perk selection
        selection = {}
        perks_list = roll.get('perks', [])

        for perk_name in perks_list:
            perk_hash, exact_perk = lookup_hash(perk_name, PERK_LOOKUP)
            if perk_hash:
                selection[str(perk_hash)] = "OR"
                if not exact_perk:
                    uncertain.append(f"⚠️ Fuzzy perk match: '{perk_name}'")
            else:
                uncertain.append(f"❓ Unknown perk: '{perk_name}'")

        if selection:  # Only add if we found at least one perk
            mode = roll.get('mode', 'Unknown')
            notes = roll.get('notes', '')
            timestamp = roll.get('timestamp', '')

            # Build URLs
            timestamped_url = build_timestamped_url(video_id, timestamp) if video_id else video_url
            base_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else video_url

            profile = {
                "id": str(uuid.uuid4()),
                "name": f"{mode} Roll",
                "notes": notes,
                "selection": selection,
                # Video source metadata
                "source": {
                    "author": video_channel,
                    "videoTitle": video_title,
                    "timestamp": timestamp,
                    "timestampUrl": timestamped_url,
                    "videoUrl": base_url,
                }
            }

            # Check if weapon already exists in results
            existing = next((r for r in results if r['weaponHash'] == weapon_hash), None)
            if existing:
                existing['profiles'].append(profile)
            else:
                results.append({
                    "weaponHash": weapon_hash,
                    "weaponName": weapon_name,
                    "profiles": [profile]
                })

    return results, uncertain

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    print("=" * 50)
    print("YouTube God Roll Agent → D3 Import")
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

    playlist_link = input("\n🔗 Paste the YouTube Playlist URL: ").strip()

    start_input = input("▶️  Start at video # (Press Enter for 1): ").strip()
    start_index = int(start_input) - 1 if start_input else 0

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    json_filename = os.path.join(OUTPUT_DIR, f"God_Roll_Import_{timestamp}.json")
    review_filename = os.path.join(OUTPUT_DIR, f"God_Roll_Review_{timestamp}.md")

    videos = get_playlist_videos(playlist_link)

    print(f"\n📝 Output files:")
    print(f"   • {json_filename} (D3 import)")
    print(f"   • {review_filename} (human review)")
    print(f"🤖 Model: {MODEL_NAME}")
    print("-" * 50)

    all_results = []
    all_uncertain = []

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

        # Build video info for D3 export
        video_info = {
            'title': title,
            'id': video_id,
            'channel': channel,
            'url': url,
        }

        results, uncertain = convert_to_d3_format(god_rolls, video_info)
        all_results.extend(results)

        if uncertain:
            all_uncertain.append(f"\n## {title}")
            all_uncertain.extend(uncertain)

        # Progressive save after each video
        d3_export = {
            "version": "1.0",
            "exportedAt": datetime.now().isoformat(),
            "godRolls": all_results
        }
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(d3_export, f, indent=2)

        # Rate limit protection
        time.sleep(10)

    # --- FINAL SUMMARY ---
    print(f"\n✅ Saved {len(all_results)} weapons to {json_filename}")

    # Review markdown
    with open(review_filename, 'w', encoding='utf-8') as f:
        f.write(f"# God Roll Review\n")
        f.write(f"Generated: {timestamp}\n")
        f.write(f"Source: {playlist_link}\n\n")

        if all_uncertain:
            f.write("## ⚠️ Items Needing Review\n")
            f.write("\n".join(all_uncertain))
        else:
            f.write("✅ All items matched successfully!\n")

    print(f"📋 Review file: {review_filename}")
    print(f"\n🎉 Done! Import {json_filename} into D3.")
