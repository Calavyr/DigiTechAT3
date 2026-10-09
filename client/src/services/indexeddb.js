const DATABASE_NAME = 'PWA'
const DATABASE_VERSION = 1
const CACHE_STORE = 'getCache'
const OUTBOX_STORE = 'outbox'

let dbPromise

function connectDB() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'))
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const openRequest = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

      openRequest.onupgradeneeded = () => {
        const db = openRequest.result

        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: 'key' })
        }

        if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
          db.createObjectStore(OUTBOX_STORE, {
            keyPath: 'id',
            autoIncrement: true
          })
        }
      }

      openRequest.onsuccess = () => {
        const db = openRequest.result
        db.onversionchange = () => {
          db.close()
          dbPromise = null
        }
        resolve(db)
      }

      openRequest.onerror = () => {
        dbPromise = null
        reject(openRequest.error || new Error('Could not open the offline database.'))
      }

      openRequest.onblocked = () => {
        reject(new Error('The offline database upgrade is blocked by another open tab.'))
      }
    })
  }

  return dbPromise
}

function withStore(storeName, mode, action) {
  return connectDB().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    let result

    try {
      result = action(store)
    } catch (error) {
      reject(error)
      return
    }

    transaction.oncomplete = () => resolve(result?.result)
    transaction.onerror = () => reject(transaction.error || result?.error)
    transaction.onabort = () => reject(transaction.error || new Error('Offline database operation was aborted.'))
  }))
}

export function getCachedResponse(key) {
  return withStore(CACHE_STORE, 'readonly', store => store.get(key))
    .then(record => record?.data)
}

export function cacheResponse(key, data) {
  return withStore(CACHE_STORE, 'readwrite', store => store.put({ key, data, updatedAt: Date.now() }))
}

export function addToOutbox(request) {
  return withStore(OUTBOX_STORE, 'readwrite', store => store.add({
    ...request,
    queuedAt: Date.now()
  }))
}

export function getOutbox() {
  return withStore(OUTBOX_STORE, 'readonly', store => store.getAll())
}

export function removeFromOutbox(id) {
  return withStore(OUTBOX_STORE, 'readwrite', store => store.delete(id))
}

export function clearOfflineData() {
  return connectDB().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE, OUTBOX_STORE], 'readwrite')
    transaction.objectStore(CACHE_STORE).clear()
    transaction.objectStore(OUTBOX_STORE).clear()
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error || new Error('Could not clear offline data.'))
  }))
}
