import { DB_NAME, DB_VERSION, MANIFEST_STORE_NAME, type ManifestTableName } from './constants'

/**
 * IndexedDB wrapper for storing large manifest data
 */
class IndexedDBStorage {
  private db: IDBDatabase | null = null

  /**
   * Initialize IndexedDB connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create manifest store if it doesn't exist
        if (!db.objectStoreNames.contains(MANIFEST_STORE_NAME)) {
          db.createObjectStore(MANIFEST_STORE_NAME)
        }
      }
    })
  }

  /**
   * Store manifest table data
   */
  async setManifestTable(tableName: ManifestTableName, data: Record<string, any>): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MANIFEST_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(MANIFEST_STORE_NAME)
      const request = store.put(data, tableName)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to store ${tableName}`))
    })
  }

  /**
   * Get manifest table data
   */
  async getManifestTable(tableName: ManifestTableName): Promise<Record<string, any> | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MANIFEST_STORE_NAME], 'readonly')
      const store = transaction.objectStore(MANIFEST_STORE_NAME)
      const request = store.get(tableName)

      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = () => reject(new Error(`Failed to get ${tableName}`))
    })
  }

  /**
   * Store manifest version
   */
  async setManifestVersion(version: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MANIFEST_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(MANIFEST_STORE_NAME)
      const request = store.put(version, 'version')

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to store manifest version'))
    })
  }

  /**
   * Get manifest version
   */
  async getManifestVersion(): Promise<string | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MANIFEST_STORE_NAME], 'readonly')
      const store = transaction.objectStore(MANIFEST_STORE_NAME)
      const request = store.get('version')

      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = () => reject(new Error('Failed to get manifest version'))
    })
  }

  /**
   * Clear all manifest data
   */
  async clearManifest(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MANIFEST_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(MANIFEST_STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to clear manifest'))
    })
  }
}

export const indexedDBStorage = new IndexedDBStorage()
