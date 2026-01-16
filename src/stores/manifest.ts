import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { manifestAPI, type ManifestDownloadProgress } from '@/api/manifest'
import { indexedDBStorage } from '@/utils/storage'
import { manifestService } from '@/services/manifest-service'
import { REQUIRED_MANIFEST_TABLES } from '@/utils/constants'

export const useManifestStore = defineStore('manifest', () => {
  // State
  const version = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const downloadProgress = ref<ManifestDownloadProgress | null>(null)
  const isInitialized = ref(false)

  // Computed
  const isLoaded = computed(() => isInitialized.value && version.value !== null)

  const progressPercentage = computed(() => {
    return downloadProgress.value?.percentage || 0
  })

  const currentTable = computed(() => {
    return downloadProgress.value?.table || ''
  })

  // Actions
  async function initialize(): Promise<void> {
    if (isInitialized.value) {
      return // Already initialized
    }

    loading.value = true
    error.value = null

    try {
      // Initialize IndexedDB
      await indexedDBStorage.init()

      // Check if we have a cached manifest
      const cachedVersion = await indexedDBStorage.getManifestVersion()

      if (cachedVersion) {
        // Verify all required tables exist in cache
        let allTablesExist = true
        for (const tableName of REQUIRED_MANIFEST_TABLES) {
          const tableData = await indexedDBStorage.getManifestTable(tableName)
          if (!tableData) {
            allTablesExist = false
            break
          }
        }

        if (allTablesExist) {
          version.value = cachedVersion

          // Load tables into memory
          await manifestService.loadAllTables([...REQUIRED_MANIFEST_TABLES])

          isInitialized.value = true
          loading.value = false
          return
        }

        // Missing tables - clear and re-download
        await indexedDBStorage.clearManifest()
      }

      // No cached manifest, need to download
      await downloadManifest()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize manifest'
      loading.value = false
    }
  }

  async function downloadManifest(): Promise<void> {
    loading.value = true
    error.value = null
    downloadProgress.value = null

    try {
      // Get manifest info to check version
      const manifestInfo = await manifestAPI.getManifestInfo()
      const latestVersion = manifestInfo.version

      // Check if we need to update
      const cachedVersion = await indexedDBStorage.getManifestVersion()

      if (cachedVersion === latestVersion) {
        version.value = latestVersion

        // Load tables into memory
        await manifestService.loadAllTables([...REQUIRED_MANIFEST_TABLES])

        isInitialized.value = true
        loading.value = false
        return
      }

      // Download all required tables
      const tables = await manifestAPI.downloadAllTables('en', (progress) => {
        downloadProgress.value = progress
      })

      // Store in IndexedDB
      for (const [tableName, tableData] of tables.entries()) {
        await indexedDBStorage.setManifestTable(tableName, tableData)
      }

      // Store version
      await indexedDBStorage.setManifestVersion(latestVersion)
      version.value = latestVersion

      // Load tables into memory
      await manifestService.loadAllTables([...REQUIRED_MANIFEST_TABLES])

      isInitialized.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to download manifest'
    } finally {
      loading.value = false
      downloadProgress.value = null
    }
  }

  async function checkForUpdates(): Promise<boolean> {
    try {
      const manifestInfo = await manifestAPI.getManifestInfo()
      const latestVersion = manifestInfo.version

      return latestVersion !== version.value
    } catch {
      return false
    }
  }

  async function clearManifest(): Promise<void> {
    await indexedDBStorage.clearManifest()
    manifestService.clearCache()
    version.value = null
    isInitialized.value = false
    error.value = null
  }

  return {
    version,
    loading,
    error,
    downloadProgress,
    isInitialized,
    isLoaded,
    progressPercentage,
    currentTable,
    initialize,
    downloadManifest,
    checkForUpdates,
    clearManifest
  }
})
