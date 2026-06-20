import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'
import { readCachedAlerts, getNotifiedIds, markNotifiedIds } from './utils/alertCache'

// ── Auto-update: activate new SW as soon as it's installed ──────────────────
// VitePWA's registerSW sends SKIP_WAITING when a new version is ready.
// Without this handler the new SW stays in 'waiting' forever.
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

// ── Firebase Messaging ───────────────────────────────────────────────────────
const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

const messaging = getMessaging(firebaseApp)

onBackgroundMessage(messaging, ({ data = {} }) => {
  self.registration.showNotification(data.title || 'Dirham', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  })
})

// ── Periodic Background Sync ─────────────────────────────────────────────────
// Chrome/Android only — wakes the SW once a day to check cached alerts and
// show notifications even when the app is not open.
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-alerts') {
    event.waitUntil(checkAndNotify())
  }
})

async function checkAndNotify() {
  const alerts = await readCachedAlerts()
  if (!alerts.length) return

  const today = new Date().toDateString()
  const notified = await getNotifiedIds(today)

  const pending = alerts.filter(
    a => (a.severity === 'high' || a.severity === 'medium') && !notified.includes(a.id)
  )
  if (!pending.length) return

  for (const alert of pending) {
    await self.registration.showNotification(alert.title, {
      body: alert.description,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: alert.id,
    })
  }

  await markNotifiedIds(today, [...notified, ...pending.map(a => a.id)])
}
