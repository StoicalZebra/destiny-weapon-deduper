#!/usr/bin/env python3
"""
Quick test script for single video analysis.
Shows raw Gemini output for prompt debugging.
"""

import os
import sys
import json
from datetime import datetime
from youtube_agent import (
    get_video_metadata,
    get_transcript_with_ytdlp,
    analyze_transcript,
    parse_gemini_response,
    convert_to_d3_format,
    PERK_LOOKUP,
    WEAPON_LOOKUP,
    OUTPUT_DIR,
)

def test_video(video_url):
    print("=" * 60)
    print("Single Video Test")
    print("=" * 60)

    if not PERK_LOOKUP or not WEAPON_LOOKUP:
        print("❌ Lookup files not found!")
        return

    print(f"\n📚 Loaded {len(PERK_LOOKUP)} perks, {len(WEAPON_LOOKUP)} weapons")

    # Get metadata
    print(f"\n🔗 Video: {video_url}")
    print("📡 Fetching metadata...")
    metadata = get_video_metadata(video_url)

    if not metadata:
        print("❌ Could not fetch video metadata")
        return

    title = metadata.get('title', 'Unknown')
    channel = metadata.get('channel', 'Unknown')
    video_id = metadata.get('id', '')

    print(f"📺 Title: {title}")
    print(f"👤 Channel: {channel}")

    # Get transcript
    print("\n📝 Fetching transcript...")
    transcript = get_transcript_with_ytdlp(video_url)

    if not transcript:
        print("❌ No subtitles found")
        return

    print(f"✅ Got transcript ({len(transcript)} chars)")

    # Analyze with Gemini
    print("\n🧠 Analyzing with Gemini...")
    raw_response = analyze_transcript(transcript, title)

    print("\n" + "=" * 60)
    print("RAW GEMINI RESPONSE:")
    print("=" * 60)
    print(raw_response)

    # Parse response
    print("\n" + "=" * 60)
    print("PARSED JSON:")
    print("=" * 60)
    god_rolls = parse_gemini_response(raw_response)

    if god_rolls is None:
        print("❌ Failed to parse JSON")
        return

    print(json.dumps(god_rolls, indent=2))

    # Convert to D3 format
    print("\n" + "=" * 60)
    print("D3 FORMAT:")
    print("=" * 60)

    video_info = {
        'title': title,
        'id': video_id,
        'channel': channel,
        'url': video_url,
    }

    results, uncertain = convert_to_d3_format(god_rolls, video_info)
    print(json.dumps(results, indent=2))

    if uncertain:
        print("\n⚠️ Uncertain matches:")
        for item in uncertain:
            print(f"   {item}")

    # Save outputs
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

    # Save D3 import JSON
    json_filename = os.path.join(OUTPUT_DIR, f"Test_{timestamp}.json")
    d3_export = {
        "version": "1.0",
        "exportedAt": datetime.now().isoformat(),
        "source": video_url,
        "godRolls": results
    }
    with open(json_filename, 'w', encoding='utf-8') as f:
        json.dump(d3_export, f, indent=2)

    # Save raw Gemini response for debugging
    raw_filename = os.path.join(OUTPUT_DIR, f"Test_{timestamp}_raw.json")
    with open(raw_filename, 'w', encoding='utf-8') as f:
        json.dump(god_rolls, f, indent=2)

    print(f"\n📁 Saved to:")
    print(f"   • {json_filename} (D3 import)")
    print(f"   • {raw_filename} (raw Gemini response)")
    print("\n✅ Done!")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_single_video.py <youtube_url>")
        print("Example: python test_single_video.py 'https://www.youtube.com/watch?v=xxx'")
        sys.exit(1)

    test_video(sys.argv[1])
