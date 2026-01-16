import { describe, it, expect } from 'vitest'
import {
  parseTimestampToSeconds,
  extractYouTubeVideoId,
  buildTimestampedYouTubeUrl,
  getTimestampedUrl,
} from './youtube'

describe('parseTimestampToSeconds', () => {
  it('parses MM:SS format', () => {
    expect(parseTimestampToSeconds('10:41')).toBe(641)
    expect(parseTimestampToSeconds('0:30')).toBe(30)
    expect(parseTimestampToSeconds('1:00')).toBe(60)
    expect(parseTimestampToSeconds('59:59')).toBe(3599)
  })

  it('parses H:MM:SS format', () => {
    expect(parseTimestampToSeconds('1:02:30')).toBe(3750)
    expect(parseTimestampToSeconds('0:10:41')).toBe(641)
    expect(parseTimestampToSeconds('2:00:00')).toBe(7200)
  })

  it('handles @ prefix', () => {
    expect(parseTimestampToSeconds('@10:41')).toBe(641)
    expect(parseTimestampToSeconds('@1:02:30')).toBe(3750)
  })

  it('handles whitespace', () => {
    expect(parseTimestampToSeconds(' 10:41 ')).toBe(641)
    expect(parseTimestampToSeconds('@ 10:41')).toBe(641)
  })

  it('returns null for invalid input', () => {
    expect(parseTimestampToSeconds('')).toBeNull()
    expect(parseTimestampToSeconds('invalid')).toBeNull()
    expect(parseTimestampToSeconds('10')).toBeNull()
    expect(parseTimestampToSeconds('10:60')).toBeNull() // 60 seconds invalid
    expect(parseTimestampToSeconds('10:41:30:00')).toBeNull() // too many parts
    expect(parseTimestampToSeconds('abc:def')).toBeNull()
  })

  it('returns null for negative values', () => {
    expect(parseTimestampToSeconds('-1:30')).toBeNull()
    expect(parseTimestampToSeconds('10:-30')).toBeNull()
  })
})

describe('extractYouTubeVideoId', () => {
  const testVideoId = 'Ljg_7aSDdUU'

  it('extracts from youtube.com/watch?v= format', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=Ljg_7aSDdUU')).toBe(testVideoId)
    expect(extractYouTubeVideoId('https://youtube.com/watch?v=Ljg_7aSDdUU')).toBe(testVideoId)
    expect(extractYouTubeVideoId('http://www.youtube.com/watch?v=Ljg_7aSDdUU')).toBe(testVideoId)
  })

  it('extracts from youtube.com/watch with extra params', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=Ljg_7aSDdUU&t=515s')).toBe(
      testVideoId,
    )
    expect(
      extractYouTubeVideoId('https://www.youtube.com/watch?v=Ljg_7aSDdUU&si=HGQLhm_SuJDGO7Pj'),
    ).toBe(testVideoId)
  })

  it('extracts from youtu.be short URL', () => {
    expect(extractYouTubeVideoId('https://youtu.be/Ljg_7aSDdUU')).toBe(testVideoId)
    expect(extractYouTubeVideoId('https://youtu.be/Ljg_7aSDdUU?t=641')).toBe(testVideoId)
    expect(extractYouTubeVideoId('https://youtu.be/Ljg_7aSDdUU?si=HGQLhm_SuJDGO7Pj&t=641')).toBe(
      testVideoId,
    )
  })

  it('extracts from embed URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/Ljg_7aSDdUU')).toBe(testVideoId)
    expect(extractYouTubeVideoId('https://youtube.com/embed/Ljg_7aSDdUU')).toBe(testVideoId)
  })

  it('extracts from /v/ URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/v/Ljg_7aSDdUU')).toBe(testVideoId)
  })

  it('returns null for invalid URLs', () => {
    expect(extractYouTubeVideoId('')).toBeNull()
    expect(extractYouTubeVideoId('not a url')).toBeNull()
    expect(extractYouTubeVideoId('https://example.com')).toBeNull()
    expect(extractYouTubeVideoId('https://vimeo.com/12345')).toBeNull()
    expect(extractYouTubeVideoId('https://youtube.com')).toBeNull() // no video ID
  })
})

describe('buildTimestampedYouTubeUrl', () => {
  it('builds correct youtu.be URL with timestamp', () => {
    expect(buildTimestampedYouTubeUrl('Ljg_7aSDdUU', 641)).toBe('https://youtu.be/Ljg_7aSDdUU?t=641')
  })

  it('floors decimal seconds', () => {
    expect(buildTimestampedYouTubeUrl('abc123', 641.5)).toBe('https://youtu.be/abc123?t=641')
  })

  it('handles zero seconds', () => {
    expect(buildTimestampedYouTubeUrl('abc123', 0)).toBe('https://youtu.be/abc123?t=0')
  })
})

describe('getTimestampedUrl', () => {
  it('builds timestamped URL from full YouTube URL and timestamp', () => {
    expect(getTimestampedUrl('https://www.youtube.com/watch?v=Ljg_7aSDdUU', '10:41')).toBe(
      'https://youtu.be/Ljg_7aSDdUU?t=641',
    )
  })

  it('builds timestamped URL from youtu.be URL and timestamp', () => {
    expect(getTimestampedUrl('https://youtu.be/Ljg_7aSDdUU', '8:35')).toBe(
      'https://youtu.be/Ljg_7aSDdUU?t=515',
    )
  })

  it('handles timestamp with @ prefix', () => {
    expect(getTimestampedUrl('https://www.youtube.com/watch?v=abc123', '@5:00')).toBe(
      'https://youtu.be/abc123?t=300',
    )
  })

  it('returns null for invalid YouTube URL', () => {
    expect(getTimestampedUrl('https://example.com', '10:41')).toBeNull()
    expect(getTimestampedUrl('', '10:41')).toBeNull()
  })

  it('returns null for invalid timestamp', () => {
    expect(getTimestampedUrl('https://www.youtube.com/watch?v=abc123', '')).toBeNull()
    expect(getTimestampedUrl('https://www.youtube.com/watch?v=abc123', 'invalid')).toBeNull()
  })
})
