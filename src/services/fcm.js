import { getToken, onMessage } from 'firebase/messaging'
import { getMessagingInstance } from './firebase'
import { saveFcmToken } from './firestore'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) throw new Error('not_supported')

  const permission = await Notification.requestPermission()
  if (permission === 'denied') throw new Error('permission_denied')
  if (permission !== 'granted') return null // dismissed without granting

  const messaging = await getMessagingInstance()
  if (!messaging) throw new Error('messaging_unavailable')

  try {
    // Pass the existing VitePWA service worker registration so Firebase doesn't
    // try to register a competing SW at the same scope.
    const swReg = await navigator.serviceWorker.ready
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg })
    if (token) await saveFcmToken(token).catch(() => {})
    return token
  } catch {
    throw new Error('token_failed')
  }
}

export const onForegroundMessage = async (callback) => {
  const messaging = await getMessagingInstance()
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}

export const scheduleLocalNotification = (title, body, delayMs = 0) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  setTimeout(() => {
    new Notification(title, { body, icon: '/finance-app/icons/icon-192.png' })
  }, delayMs)
}
