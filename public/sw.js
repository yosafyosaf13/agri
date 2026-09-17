// ─── Service Worker for Agri Field Work System — offline PWA support ───
// Caches the app shell + static assets for offline use.
// Network-first for API routes, cache-first for static assets.

const CACHE_VERSION = 'agri-v2-001'
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/avatars/avatar-listening.png',
  '/avatars/avatar-speaking.png',
]

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) =>
        Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  )
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_VERSION)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

// Fetch: network-first for API/navigation, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Skip non-GET requests (mutations go to network)
  if (req.method !== 'GET') return

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return

  // API routes: network-first, fall back to cache only if offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache successful GET API responses for short offline use
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(req, clone).catch(() => {})
            })
          }
          return res
        })
        .catch(() => caches.match(req))
    )
    return
  }

  // Navigation requests: serve cached app shell (SPA) when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/').then((r) => r || caches.match(req)))
    )
    return
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone()
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(req, clone).catch(() => {})
          })
        }
        return res
      })
    })
  )
})

// Allow page to trigger skipWaiting from the client
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
