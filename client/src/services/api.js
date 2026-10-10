import {
  addToOutbox,
  cacheResponse,
  clearOfflineData,
  getCachedResponse,
  getOutbox,
  removeFromOutbox
} from './indexeddb.js'

const API_BASE = '/api'
const AUTH_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/account',
  '/auth/refresh',
  '/auth/resetPassword'
])

let outboxSyncPromise = null

function isGet(method) {
  return method.toUpperCase() === 'GET'
}

function isQueueable(endpoint, method) {
  return !isGet(method) && !AUTH_ENDPOINTS.has(endpoint.split('?')[0])
}

function cacheKey(endpoint) {
  return `${API_BASE}${endpoint}`
}

function makeQueuedResult() {
  return {
    queued: true,
    status: 202,
    message: 'Saved on this device and will sync when you are online.'
  }
}

function serializeRequest(url, options) {
  return {
    url,
    method: options.method,
    headers: { ...options.headers },
    body: options.body ?? null
  }
}

async function parseResponse(response) {
  return response.json().catch(() => ({}))
}

async function syncOutbox() {
  if (!navigator.onLine || outboxSyncPromise) return outboxSyncPromise

  outboxSyncPromise = (async () => {
    const queuedRequests = await getOutbox()

    // Keep the queue ordered so later updates cannot overtake earlier changes.
    for (const queued of queuedRequests) {
      if (!navigator.onLine) break

      let response
      try {
        response = await fetch(queued.url, {
          method: queued.method,
          headers: queued.headers,
          body: queued.body,
          credentials: 'include'
        })
      } catch {
        break
      }

      // Retain failed requests for inspection/retry, remove only server-accepted work.
      if (!response.ok) break
      await removeFromOutbox(queued.id)
    }
  })().catch(error => {
    console.error('Could not sync offline requests:', error)
  }).finally(() => {
    outboxSyncPromise = null
  })

  return outboxSyncPromise
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOutbox()
  })

  // Also retry anything left from a previous visit when the app starts online.
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    syncOutbox()
  }
}

export async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const method = (options.method || 'GET').toUpperCase()
  const requestOptions = {
    ...options,
    method,
    credentials: 'include',
    headers: {
      ...(options.body == null ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers
    }
  }
  const key = cacheKey(endpoint)

  if (isGet(method) && typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = await getCachedResponse(key)
    if (cached !== undefined) return cached
    throw new Error('You are offline and this information is not available on this device yet.')
  }

  if (isQueueable(endpoint, method) && typeof navigator !== 'undefined' && !navigator.onLine) {
    await addToOutbox(serializeRequest(url, requestOptions))
    return makeQueuedResult()
  }

  try {
    const response = await fetch(url, requestOptions)
    const data = await parseResponse(response)
    data.status ??= response.status

    if (!response.ok && endpoint !== '/auth/me') {
      throw new Error(data.message || `HTTP error. Status ${response.status}`)
    }

    if (isGet(method) && response.ok) {
      await cacheResponse(key, data).catch(error => {
        console.error('Could not cache API response for offline use:', error)
      })
    }

    if ((endpoint === '/auth/logout' || endpoint === '/auth/account') && response.ok) {
      await clearOfflineData().catch(error => {
        console.error('Could not clear offline data after logout:', error)
      })
    }

    return data
  } catch (error) {
    if (isGet(method) && error instanceof TypeError) {
      const cached = await getCachedResponse(key).catch(() => undefined)
      if (cached !== undefined) return cached
    } else if (isQueueable(endpoint, method) && error instanceof TypeError) {
      // fetch rejects with TypeError for network failures; HTTP responses still throw above
      await addToOutbox(serializeRequest(url, requestOptions))
      return makeQueuedResult()
    }

    if (endpoint !== '/auth/me') console.error('API request failure:', error)
    throw error
  }
}

export { syncOutbox }
