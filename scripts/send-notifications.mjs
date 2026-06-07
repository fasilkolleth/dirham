import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { getAllAlerts } from '../src/utils/alertCalculators.js'

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('FIREBASE_SERVICE_ACCOUNT env var is not set.')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })

const db = getFirestore()

async function main() {
  // 1. Get saved FCM token
  const pushDoc = await db.doc('config/push').get()
  if (!pushDoc.exists) return console.log('No FCM token saved — skipping.')
  const { token, notifiedAlerts = {} } = pushDoc.data()
  if (!token) return console.log('FCM token is empty — skipping.')

  // 2. Get user settings (alert thresholds)
  const settingsDoc = await db.doc('config/settings').get()
  const settings = settingsDoc.exists ? settingsDoc.data() : {}

  // 3. Fetch all data in parallel
  const [emisSnap, ownedSnap, rentedSnap, lendingsSnap] = await Promise.all([
    db.collection('emi_tracker').get(),
    db.collection('property_owned').get(),
    db.collection('property_rented').get(),
    db.collection('lending').get(),
  ])

  const emis = emisSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const lendings = lendingsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // 4. Fetch cheques for each property (subcollections)
  const [ownedProperties, rentedProperties] = await Promise.all([
    Promise.all(ownedSnap.docs.map(async d => {
      const cheques = await db.collection('property_owned').doc(d.id).collection('cheques').get()
      return { id: d.id, ...d.data(), cheques: cheques.docs.map(c => ({ id: c.id, ...c.data() })) }
    })),
    Promise.all(rentedSnap.docs.map(async d => {
      const cheques = await db.collection('property_rented').doc(d.id).collection('cheques').get()
      return { id: d.id, ...d.data(), cheques: cheques.docs.map(c => ({ id: c.id, ...c.data() })) }
    })),
  ])

  // 5. Calculate alerts using the same logic as the app
  const alerts = getAllAlerts({ emis, ownedProperties, rentedProperties, lending: lendings, settings })
  const urgent = alerts.filter(a => a.severity === 'high' || a.severity === 'medium')

  if (!urgent.length) {
    console.log('No urgent alerts — no notification sent.')
    return
  }

  // 6. Filter to only new alerts or ones that escalated in severity.
  //    Key = alertId_severity so re-notifying on escalation (medium→high) works.
  const pending = urgent.filter(a => notifiedAlerts[`${a.id}_${a.severity}`] !== true)

  if (!pending.length) {
    console.log('All alerts already notified — no new notification sent.')
    return
  }

  // 7. Build notification text
  const title = pending.length === 1
    ? pending[0].title
    : `${pending.length} New Alerts Require Attention`

  const body = pending.length === 1
    ? pending[0].description
    : pending.slice(0, 3).map(a => `• ${a.title}`).join('\n') +
      (pending.length > 3 ? `\n+ ${pending.length - 3} more` : '')

  // 8. Send FCM push as data-only so Firebase doesn't auto-show a notification.
  //    The service worker's onBackgroundMessage handler shows exactly one notification.
  await getMessaging().send({
    token,
    data: { title, body },
    webpush: {
      headers: { Urgency: 'high' },
      fcmOptions: { link: '/' },
    },
  })

  // 9. Mark newly notified alerts + record date + prune resolved alerts
  const activeIds = new Set(urgent.map(a => `${a.id}_${a.severity}`))
  const updatedNotified = {}
  // Keep only alerts still active (auto-clears resolved ones)
  for (const key of Object.keys(notifiedAlerts)) {
    if (activeIds.has(key)) updatedNotified[key] = true
  }
  // Add newly notified
  for (const a of pending) {
    updatedNotified[`${a.id}_${a.severity}`] = true
  }

  await db.doc('config/push').set({
    notifiedAlerts: updatedNotified,
    lastNotifiedDate: new Date().toDateString(),
  }, { merge: true })

  console.log(`Push sent: "${title}" (${pending.length} new alert${pending.length !== 1 ? 's' : ''})`)
}

main().catch(err => { console.error(err); process.exit(1) })
