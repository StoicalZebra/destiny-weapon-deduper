/**
 * Sort wishlist file by item hash
 *
 * This script sorts all dimwishlist entries by their item hash value,
 * grouping all rolls for the same weapon together for easier visual review.
 *
 * Usage: node scripts/sort-wishlist.js [path-to-wishlist]
 * Default: data/wishlists/StoicalZebra-wishlist.txt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const wishlistPath = process.argv[2] || 'data/wishlists/StoicalZebra-wishlist.txt';
const fullPath = path.resolve(process.cwd(), wishlistPath);

console.log(`Sorting: ${fullPath}`);

const content = fs.readFileSync(fullPath, 'utf-8');
const lines = content.split('\n');

// Separate header lines from wishlist entries
const headerLines = [];
const wishlistEntries = [];

let inHeader = true;
for (const line of lines) {
  if (inHeader && (line.startsWith('title:') || line.startsWith('description:') || line.trim() === '')) {
    headerLines.push(line);
    if (line.startsWith('description:')) {
      inHeader = false;
    }
  } else if (line.startsWith('dimwishlist:')) {
    // Extract item hash for sorting
    const match = line.match(/item=(\d+)/);
    const hash = match ? parseInt(match[1], 10) : 0;
    wishlistEntries.push({ hash, line });
  }
}

// Sort by hash (numerically)
wishlistEntries.sort((a, b) => a.hash - b.hash);

// Group by hash and rebuild output
let output = headerLines.join('\n') + '\n\n';
let lastHash = null;

for (const entry of wishlistEntries) {
  // Add blank line between different weapons
  if (lastHash !== null && entry.hash !== lastHash) {
    output += '\n';
  }
  output += entry.line + '\n';
  lastHash = entry.hash;
}

fs.writeFileSync(fullPath, output);

const uniqueWeapons = new Set(wishlistEntries.map(e => e.hash)).size;
console.log(`Sorted ${wishlistEntries.length} wishlist entries by item hash`);
console.log(`Unique item hashes: ${uniqueWeapons}`);
