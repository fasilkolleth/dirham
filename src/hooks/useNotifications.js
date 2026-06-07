import { useEffect } from 'react'
import { useAlerts } from './useAlerts'

// Triggers browser notifications for high-severity alerts once per day
export function useNotifications() {
  const { alerts } = useAlerts()

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (!alerts.length) return

    const today = new Date().toDateString()
    const storageKey = `notified_${today}`
    const alreadyNotified = JSON.parse(localStorage.getItem(storageKey) || '[]')

    const pending = alerts.filter(a =>
      (a.severity === 'high' || a.severity === 'medium') &&
      !alreadyNotified.includes(a.id)
    )

    if (!pending.length) return

    // Small delay so app loads fully before showing notifications
    const timer = setTimeout(() => {
      pending.forEach(alert => {
        try {
          new Notification(alert.title, {
            body: alert.description,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: alert.id,
          })
        } catch {}
      })

      localStorage.setItem(storageKey, JSON.stringify([
        ...alreadyNotified,
        ...pending.map(a => a.id),
      ]))
    }, 2000)

    return () => clearTimeout(timer)
  }, [alerts])
}
