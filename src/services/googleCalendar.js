const BASE_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const TIME_ZONE = 'Asia/Dubai' // UAE — Gulf Standard Time (UTC+4)

// Timed events give reliable push notifications on iPhone.
// All-day events with popup reminders are unreliable across calendar clients.
function buildEventBody(title, description, dueDate, earlyReminderDays, reminderTime = '09:00') {
  const [endHour, endMin] = reminderTime.split(':').map(Number)
  const endMinutes = endMin + 30
  const endTime = `${String(endHour + Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

  const overrides = [
    { method: 'popup', minutes: 0 },
  ]
  if (earlyReminderDays > 0) {
    overrides.push({ method: 'popup', minutes: earlyReminderDays * 24 * 60 })
  }

  return {
    summary: title,
    description,
    start: { dateTime: `${dueDate}T${reminderTime}:00`, timeZone: TIME_ZONE },
    end:   { dateTime: `${dueDate}T${endTime}:00`,      timeZone: TIME_ZONE },
    reminders: { useDefault: false, overrides },
  }
}

export async function createCalendarEvent(accessToken, { title, description, dueDate, earlyReminderDays = 0, reminderTime = '09:00' }) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildEventBody(title, description, dueDate, earlyReminderDays, reminderTime)),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Calendar API error ${res.status}`)
  }

  const data = await res.json()
  return data.id
}

export async function updateCalendarEvent(accessToken, eventId, { title, description, dueDate, earlyReminderDays = 0, reminderTime = '09:00' }) {
  const res = await fetch(`${BASE_URL}/${eventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildEventBody(title, description, dueDate, earlyReminderDays, reminderTime)),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Calendar API error ${res.status}`)
  }
}

export async function deleteCalendarEvent(accessToken, eventId) {
  const res = await fetch(`${BASE_URL}/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok && res.status !== 404) {
    throw new Error(`Calendar API error ${res.status}`)
  }
}
