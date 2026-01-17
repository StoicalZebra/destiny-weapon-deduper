import { describe, it, expect } from 'vitest'
import { parseLightGgUrl } from './url-parser'

describe('parseLightGgUrl', () => {
  describe('valid URLs', () => {
    it('parses full URL with www and slug', () => {
      const result = parseLightGgUrl('https://www.light.gg/db/items/2873508409/high-tyrant/')
      expect(result).toBe(2873508409)
    })

    it('parses URL without www', () => {
      const result = parseLightGgUrl('https://light.gg/db/items/2873508409/high-tyrant/')
      expect(result).toBe(2873508409)
    })

    it('parses URL without trailing slash', () => {
      const result = parseLightGgUrl('https://www.light.gg/db/items/2873508409/high-tyrant')
      expect(result).toBe(2873508409)
    })

    it('parses URL without slug', () => {
      const result = parseLightGgUrl('https://www.light.gg/db/items/2873508409')
      expect(result).toBe(2873508409)
    })

    it('parses URL without protocol', () => {
      const result = parseLightGgUrl('www.light.gg/db/items/2873508409/high-tyrant/')
      expect(result).toBe(2873508409)
    })

    it('parses URL without protocol or www', () => {
      const result = parseLightGgUrl('light.gg/db/items/2873508409/high-tyrant/')
      expect(result).toBe(2873508409)
    })

    it('handles URL with query parameters', () => {
      const result = parseLightGgUrl('https://www.light.gg/db/items/2873508409/high-tyrant/?hl=en')
      expect(result).toBe(2873508409)
    })

    it('handles URL with hash fragment', () => {
      const result = parseLightGgUrl('https://www.light.gg/db/items/2873508409/high-tyrant/#perks')
      expect(result).toBe(2873508409)
    })

    it('trims whitespace', () => {
      const result = parseLightGgUrl('  https://www.light.gg/db/items/2873508409/high-tyrant/  ')
      expect(result).toBe(2873508409)
    })

    it('handles different weapon hashes', () => {
      expect(parseLightGgUrl('https://light.gg/db/items/1234567890/weapon-name/')).toBe(1234567890)
      expect(parseLightGgUrl('https://light.gg/db/items/1/a/')).toBe(1)
      expect(parseLightGgUrl('https://light.gg/db/items/9999999999/test/')).toBe(9999999999)
    })
  })

  describe('invalid URLs', () => {
    it('returns null for non-light.gg URLs', () => {
      expect(parseLightGgUrl('https://bungie.net/items/2873508409')).toBeNull()
      expect(parseLightGgUrl('https://google.com')).toBeNull()
      expect(parseLightGgUrl('https://d2foundry.gg/w/2873508409')).toBeNull()
    })

    it('returns null for light.gg URLs without /db/items/ path', () => {
      expect(parseLightGgUrl('https://www.light.gg/')).toBeNull()
      expect(parseLightGgUrl('https://www.light.gg/about')).toBeNull()
      expect(parseLightGgUrl('https://www.light.gg/db/')).toBeNull()
    })

    it('returns null for malformed URLs', () => {
      expect(parseLightGgUrl('not a url at all')).toBeNull()
      expect(parseLightGgUrl('')).toBeNull()
      expect(parseLightGgUrl('   ')).toBeNull()
    })

    it('returns null for URLs with non-numeric hash', () => {
      expect(parseLightGgUrl('https://www.light.gg/db/items/abc/weapon/')).toBeNull()
      expect(parseLightGgUrl('https://www.light.gg/db/items//weapon/')).toBeNull()
    })
  })
})
