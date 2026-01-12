import {
  DB_NAME,
  DB_VERSION,
  MANIFEST_STORE_NAME,
  WISHLIST_STORE_NAME,
  type ManifestTableName
} from './constants'
import type { Wishlist } from '@/models/wishlist'

/**
 * IndexedDB wrapper for storing large manifest and wishlist data
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

        // Create wishlists store if it doesn't exist (v2)
        if (!db.objectStoreNames.contains(WISHLIST_STORE_NAME)) {
          db.createObjectStore(WISHLIST_STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  }

  // ==================== Manifest Methods ====================

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

  // ==================== Wishlist Methods ====================

  /**
   * Store a wishlist (preset or user)
   * Note: Uses JSON.parse/stringify to strip Vue reactivity proxies
   */
  async setWishlist(wishlist: Wishlist): Promise<void> {
    if (!this.db) await this.init()

    // Deep clone to strip Vue reactivity and ensure IndexedDB can serialize
    const plainWishlist = JSON.parse(JSON.stringify(wishlist)) as Wishlist

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WISHLIST_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(WISHLIST_STORE_NAME)
      const request = store.put(plainWishlist)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to store wishlist ${wishlist.id}`))
    })
  }

  /**
   * Get a wishlist by ID
   */
  async getWishlist(id: string): Promise<Wishlist | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WISHLIST_STORE_NAME], 'readonly')
      const store = transaction.objectStore(WISHLIST_STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = () => reject(new Error(`Failed to get wishlist ${id}`))
    })
  }

  /**
   * Get all wishlists
   */
  async getAllWishlists(): Promise<Wishlist[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WISHLIST_STORE_NAME], 'readonly')
      const store = transaction.objectStore(WISHLIST_STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }
      request.onerror = () => reject(new Error('Failed to get all wishlists'))
    })
  }

  /**
   * Delete a wishlist by ID
   */
  async deleteWishlist(id: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WISHLIST_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(WISHLIST_STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to delete wishlist ${id}`))
    })
  }

  /**
   * Clear all wishlists
   */
  async clearWishlists(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WISHLIST_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(WISHLIST_STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to clear wishlists'))
    })
  }
}

export const indexedDBStorage = new IndexedDBStorage()
