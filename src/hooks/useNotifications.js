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

    // Mark as notified immediately so closing the app before the timer fires
    // doesn't cause them to re-appear on the next open.
    localStorage.setItem(storageKey, JSON.stringify([
      ...alreadyNotified,
      ...pending.map(a => a.id),
    ]))

    const timer = setTimeout(() => {
      try {
        const title = pending.length === 1
          ? pending[0].title
          : `${pending.length} Alerts Require Attention`
        const body = pending.length === 1
          ? pending[0].description
          : pending.slice(0, 3).map(a => `• ${a.title}`).join('\n') +
            (pending.length > 3 ? `\n+ ${pending.length - 3} more` : '')
        new Notification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'daily-alerts',
        })
      } catch {}
    }, 2000)

    return () => clearTimeout(timer)
  }, [alerts])
}
