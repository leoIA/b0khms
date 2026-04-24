// =============================================================================
// ConstrutorPro - Service Worker
// PWA offline support with caching strategies and background sync
// =============================================================================

const CACHE_NAME = 'construtorpro-v1'
const STATIC_CACHE = 'construtorpro-static-v1'
const DYNAMIC_CACHE = 'construtorpro-dynamic-v1'
const API_CACHE = 'construtorpro-api-v1'

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/projetos',
  '/api/orcamentos',
  '/api/materiais',
  '/api/fornecedores',
  '/api/clientes',
  '/api/diario-obra',
  '/api/composicoes',
  '/api/cronograma',
  '/api/financeiro',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error)
      })
  )
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !name.includes('construtorpro'))
            .map((name) => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    // Queue non-GET requests for background sync
    if (isOfflineRequest(request)) {
      event.respondWith(queueRequest(request))
      return
    }
    return
  }
  
  // API requests - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }
  
  // Static assets - Cache First
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request))
    return
  }
  
  // Navigation requests - Network First with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request))
    return
  }
  
  // Other requests - Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request))
})

// Cache First strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('[SW] Cache First failed:', error)
    return new Response('Offline', { status: 503 })
  }
}

// Network First strategy
async function networkFirst(request) {
  const cache = await caches.open(API_CACHE)
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Network First with offline fallback
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request)
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed for navigation, showing offline page')
    const cachedResponse = await caches.match('/offline')
    if (cachedResponse) {
      return cachedResponse
    }
    return new Response(
      `<!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - ConstrutorPro</title>
        <style>
          body { font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f3f4f6; }
          .container { text-align: center; padding: 2rem; }
          h1 { color: #1f2937; margin-bottom: 1rem; }
          p { color: #6b7280; margin-bottom: 1.5rem; }
          button { background: #2563eb; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; }
          button:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Você está offline</h1>
          <p>Verifique sua conexão com a internet e tente novamente.</p>
          <button onclick="location.reload()">Tentar novamente</button>
        </div>
      </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}

// Stale While Revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE)
  const cachedResponse = await cache.match(request)
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    })
    .catch(() => cachedResponse)
  
  return cachedResponse || fetchPromise
}

// Check if request is a static asset
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2']
  return staticExtensions.some(ext => url.pathname.endsWith(ext))
}

// Check if request should be queued for background sync
function isOfflineRequest(request) {
  return request.method !== 'GET' && !request.url.includes('/api/auth')
}

// Queue request for background sync
async function queueRequest(request) {
  const db = await openIndexedDB()
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.clone().text(),
    timestamp: Date.now(),
  }
  
  await db.add('pendingRequests', requestData)
  
  // Register for background sync
  await self.registration.sync.register('sync-pending-requests')
  
  return new Response(JSON.stringify({ 
    success: true, 
    queued: true, 
    message: 'Request queued for sync when online' 
  }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Background Sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag)
  
  if (event.tag === 'sync-pending-requests') {
    event.waitUntil(syncPendingRequests())
  }
})

// Sync pending requests
async function syncPendingRequests() {
  const db = await openIndexedDB()
  const pendingRequests = await db.getAll('pendingRequests')
  
  for (const request of pendingRequests) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      })
      
      if (response.ok) {
        await db.delete('pendingRequests', request.id)
        console.log('[SW] Synced request:', request.url)
        
        // Notify clients about successful sync
        const clients = await self.clients.matchAll()
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_COMPLETE',
            url: request.url,
          })
        })
      }
    } catch (error) {
      console.error('[SW] Failed to sync request:', request.url, error)
    }
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  
  let data = { title: 'ConstrutorPro', body: 'Nova notificação' }
  
  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data.body = event.data.text()
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: data.actions || [],
    })
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked')
  
  event.notification.close()
  
  const urlToOpen = event.notification.data?.url || '/'
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then((clients) => {
        // Check if there's already a window open
        for (const client of clients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen)
        }
      })
  )
})

// IndexedDB helper
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ConstrutorProOffline', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('pendingRequests')) {
        db.createObjectStore('pendingRequests', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'key' })
      }
      resolve(wrapIDBDatabase(db))
    }
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('pendingRequests')) {
        db.createObjectStore('pendingRequests', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'key' })
      }
    }
  })
}

// Wrap IDBDatabase with promise-based methods
function wrapIDBDatabase(db) {
  return {
    add: (storeName, data) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.add(data)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    },
    get: (storeName, key) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    },
    getAll: (storeName) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    },
    put: (storeName, data) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.put(data)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    },
    delete: (storeName, key) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.delete(key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    },
  }
}

console.log('[SW] Service Worker loaded')
