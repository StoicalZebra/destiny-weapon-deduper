#!/bin/bash
set -e

# Publish StoicalZebra wishlist to GitHub
# Usage: ./scripts/publish-wishlist.sh

# Find most recent StoicalZebra export in Downloads
EXPORT_FILE=$(ls -t ~/Downloads/StoicalZebra*.txt 2>/dev/null | head -1)

if [ -z "$EXPORT_FILE" ]; then
  echo "Error: No StoicalZebra export found in ~/Downloads"
  echo "Export the wishlist from the app first (Wishlists -> StoicalZebra -> Export)"
  exit 1
fi

echo "Found export: $EXPORT_FILE"

# Copy to repo
DEST="data/wishlists/StoicalZebra-wishlist.txt"
cp "$EXPORT_FILE" "$DEST"
echo "Copied to $DEST"

# Git operations
git add "$DEST"
git commit -m "chore: update StoicalZebra wishlist

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
git push origin main

echo "Pushed to GitHub!"
