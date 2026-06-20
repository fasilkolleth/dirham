import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// ── Auto-update ──────────────────────────────────────────────────────────────
// VitePWA sends SKIP_WAITING when a new version is ready.
// Without this the new SW stays in 'waiting' forever.
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// ── Workbox precaching ───────────────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/__/],
  })
)

registerRoute(
  ({ url }) => url.origin === 'https://firestore.googleapis.com',
  new NetworkFirst({
    cacheName: 'firebase-firestore',
    networkTimeoutSeconds: 10,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
)

registerRoute(
  ({ url }) => url.origin === 'https://firebasestorage.googleapis.com',
  new CacheFirst({
    cacheName: 'firebase-storage',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
)
