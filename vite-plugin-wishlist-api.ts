/**
 * Vite Plugin: Wishlist API (Dev Only)
 *
 * Exposes a local API endpoint during development for writing wishlist files
 * directly to the filesystem. This enables the "Export as Canonical" workflow
 * for updating the StoicalZebra-wishlist.txt without manual file copying.
 *
 * Security: Only available in dev mode, only writes to data/wishlists/
 */

import type { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

const WISHLISTS_DIR = 'data/wishlists'
const ARCHIVE_DIR = 'data/wishlists/archive'
const CANONICAL_FILENAME = 'StoicalZebra-wishlist.txt'

export function wishlistApiPlugin(): Plugin {
  return {
    name: 'wishlist-api',
    configureServer(server) {
      // POST /api/wishlist/canonical - Update canonical wishlist with auto-archive
      server.middlewares.use('/api/wishlist/canonical', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          // Read body
          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(chunk as Buffer)
          }
          const body = JSON.parse(Buffer.concat(chunks).toString())
          const { content } = body

          if (!content || typeof content !== 'string') {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Missing content field' }))
            return
          }

          const canonicalPath = path.join(process.cwd(), WISHLISTS_DIR, CANONICAL_FILENAME)
          const archiveDir = path.join(process.cwd(), ARCHIVE_DIR)

          // Ensure archive directory exists
          if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true })
          }

          // Archive current canonical if it exists
          if (fs.existsSync(canonicalPath)) {
            const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
            const archiveFilename = `StoicalZebra-wishlist-${timestamp}.txt`
            let archivePath = path.join(archiveDir, archiveFilename)

            // Handle multiple updates on same day
            let counter = 1
            while (fs.existsSync(archivePath)) {
              archivePath = path.join(archiveDir, `StoicalZebra-wishlist-${timestamp}-${counter}.txt`)
              counter++
            }

            fs.copyFileSync(canonicalPath, archivePath)
            console.log(`[wishlist-api] Archived previous version to ${path.relative(process.cwd(), archivePath)}`)
          }

          // Write new canonical
          fs.writeFileSync(canonicalPath, content, 'utf-8')
          console.log(`[wishlist-api] Updated ${CANONICAL_FILENAME}`)

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true, path: canonicalPath }))
        } catch (error) {
          console.error('[wishlist-api] Error:', error)
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(error) }))
        }
      })

      // GET /api/wishlist/is-dev - Check if dev API is available
      server.middlewares.use('/api/wishlist/is-dev', (_req, res) => {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ isDev: true }))
      })
    }
  }
}
