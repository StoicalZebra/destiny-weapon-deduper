import { MANIFEST_ENDPOINT, BUNGIE_ROOT, REQUIRED_MANIFEST_TABLES, type ManifestTableName } from '@/utils/constants'
import type { BungieResponse } from './types'

export interface ManifestInfo {
  version: string
  mobileAssetContentPath: string
  mobileGearAssetDataBases: Array<{
    version: number
    path: string
  }>
  mobileWorldContentPaths: Record<string, string>
  jsonWorldContentPaths: Record<string, Record<string, string>>
  jsonWorldComponentContentPaths: Record<string, Record<string, string>>
  mobileClanBannerDatabasePath: string
  mobileGearCDN: Record<string, string>
}

export interface ManifestDownloadProgress {
  table: ManifestTableName
  current: number
  total: number
  percentage: number
}

export class ManifestAPI {
  private readonly API_KEY: string

  constructor() {
    this.API_KEY = import.meta.env.VITE_BUNGIE_API_KEY || ''
  }

  /**
   * Fetch manifest metadata (version and paths to definition files)
   */
  async getManifestInfo(): Promise<ManifestInfo> {
    const response = await fetch(MANIFEST_ENDPOINT, {
      headers: {
        'X-API-Key': this.API_KEY
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch manifest info: ${response.statusText}`)
    }

    const data: BungieResponse<ManifestInfo> = await response.json()

    if (data.ErrorCode !== 1) {
      throw new Error(data.Message || 'Failed to fetch manifest info')
    }

    return data.Response
  }

  /**
   * Download a specific manifest table
   */
  async downloadManifestTable(
    tablePath: string,
    onProgress?: (progress: number) => void
  ): Promise<Record<string, any>> {
    const url = `${BUNGIE_ROOT}${tablePath}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to download manifest table: ${response.statusText}`)
    }

    // Track download progress if supported
    if (onProgress && response.body) {
      const contentLength = response.headers.get('content-length')
      if (contentLength) {
        const total = parseInt(contentLength, 10)
        let loaded = 0

        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          chunks.push(value)
          loaded += value.length
          onProgress((loaded / total) * 100)
        }

        // Combine chunks
        const blob = new Blob(chunks)
        const text = await blob.text()
        return JSON.parse(text)
      }
    }

    // Fallback: no progress tracking
    const data = await response.json()
    return data
  }

  /**
   * Download all required manifest tables
   */
  async downloadAllTables(
    language: string = 'en',
    onProgress?: (progress: ManifestDownloadProgress) => void
  ): Promise<Map<ManifestTableName, Record<string, any>>> {
    const manifestInfo = await this.getManifestInfo()
    const tables = new Map<ManifestTableName, Record<string, any>>()

    const total = REQUIRED_MANIFEST_TABLES.length

    for (let i = 0; i < REQUIRED_MANIFEST_TABLES.length; i++) {
      const tableName = REQUIRED_MANIFEST_TABLES[i]

      // Get the path for this table
      const tablePath = manifestInfo.jsonWorldComponentContentPaths[language]?.[tableName]

      if (!tablePath) {
        console.warn(`No path found for ${tableName}, skipping`)
        continue
      }

      // Download table with progress
      const tableData = await this.downloadManifestTable(
        tablePath,
        (tableProgress) => {
          if (onProgress) {
            onProgress({
              table: tableName,
              current: i + 1,
              total,
              percentage: ((i + tableProgress / 100) / total) * 100
            })
          }
        }
      )

      tables.set(tableName, tableData)

      // Report completion of this table
      if (onProgress) {
        onProgress({
          table: tableName,
          current: i + 1,
          total,
          percentage: ((i + 1) / total) * 100
        })
      }
    }

    return tables
  }
}

export const manifestAPI = new ManifestAPI()
