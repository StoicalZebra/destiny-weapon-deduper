/**
 * YouTube URL utilities for timestamp linking
 */

/**
 * Convert timestamp string (e.g., "10:41" or "1:02:30") to total seconds
 * Supports formats: "MM:SS", "H:MM:SS", "HH:MM:SS"
 */
export function parseTimestampToSeconds(timestamp: string): number | null {
  if (!timestamp) return null

  // Clean the timestamp - remove @ prefix if present
  const cleaned = timestamp.replace(/^@/, '').trim()

  // Split by colon
  const parts = cleaned.split(':').map((p) => parseInt(p, 10))

  // Validate all parts are numbers
  if (parts.some(isNaN)) return null

  if (parts.length === 2) {
    // MM:SS format
    const [minutes, seconds] = parts
    if (minutes < 0 || seconds < 0 || seconds >= 60) return null
    return minutes * 60 + seconds
  } else if (parts.length === 3) {
    // H:MM:SS format
    const [hours, minutes, seconds] = parts
    if (hours < 0 || minutes < 0 || seconds < 0 || minutes >= 60 || seconds >= 60) return null
    return hours * 3600 + minutes * 60 + seconds
  }

  return null
}

/**
 * Extract video ID from various YouTube URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null

  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace('www.', '')

    if (hostname === 'youtube.com') {
      // Check for /watch?v= format
      const videoId = urlObj.searchParams.get('v')
      if (videoId) return videoId

      // Check for /embed/VIDEO_ID or /v/VIDEO_ID format
      const pathMatch = urlObj.pathname.match(/^\/(embed|v)\/([a-zA-Z0-9_-]+)/)
      if (pathMatch) return pathMatch[2]
    } else if (hostname === 'youtu.be') {
      // Short URL format: youtu.be/VIDEO_ID
      const videoId = urlObj.pathname.slice(1).split('/')[0]
      if (videoId) return videoId
    }
  } catch {
    // Invalid URL
    return null
  }

  return null
}

/**
 * Build a timestamped YouTube URL using the short youtu.be format
 * @param videoId - The YouTube video ID
 * @param seconds - Time offset in seconds
 * @returns URL like https://youtu.be/VIDEO_ID?t=SECONDS
 */
export function buildTimestampedYouTubeUrl(videoId: string, seconds: number): string {
  return `https://youtu.be/${videoId}?t=${Math.floor(seconds)}`
}

/**
 * Given a YouTube URL and timestamp, build a timestamped link
 * Returns null if URL is invalid or timestamp can't be parsed
 */
export function getTimestampedUrl(youtubeUrl: string, timestamp: string): string | null {
  const videoId = extractYouTubeVideoId(youtubeUrl)
  if (!videoId) return null

  const seconds = parseTimestampToSeconds(timestamp)
  if (seconds === null) return null

  return buildTimestampedYouTubeUrl(videoId, seconds)
}
