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
  const { token } = pushDoc.data()
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
    console.log('No urgent alerts today — no notification sent.')
    return
  }

  // 6. Build notification text
  const title = urgent.length === 1
    ? urgent[0].title
    : `${urgent.length} Alerts Require Attention`

  const body = urgent.length === 1
    ? urgent[0].description
    : urgent.slice(0, 3).map(a => `• ${a.title}`).join('\n') +
      (urgent.length > 3 ? `\n+ ${urgent.length - 3} more` : '')

  // 7. Send FCM push — iOS routes this through APNs automatically
  await getMessaging().send({
    token,
    notification: { title, body },
    webpush: {
      notification: {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
      },
      fcmOptions: {
        link: '/',
      },
    },
  })

  // Record today's date so the app skips its foreground notification
  await db.doc('config/push').set({ lastNotifiedDate: new Date().toDateString() }, { merge: true })

  console.log(`Push sent: "${title}" (${urgent.length} alert${urgent.length !== 1 ? 's' : ''})`)
}

main().catch(err => { console.error(err); process.exit(1) })
