const BASE_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

// Timed events at 9 AM give reliable push notifications on iPhone.
// All-day events with popup reminders are unreliable across calendar clients.
function buildEventBody(title, description, dueDate, earlyReminderDays) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const overrides = [
    { method: 'popup', minutes: 0 }, // at 9 AM on the due date
  ]
  if (earlyReminderDays > 0) {
    overrides.push({ method: 'popup', minutes: earlyReminderDays * 24 * 60 })
  }

  return {
    summary: title,
    description,
    start: { dateTime: `${dueDate}T09:00:00`, timeZone },
    end:   { dateTime: `${dueDate}T09:30:00`, timeZone },
    reminders: { useDefault: false, overrides },
  }
}

export async function createCalendarEvent(accessToken, { title, description, dueDate, earlyReminderDays = 0 }) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildEventBody(title, description, dueDate, earlyReminderDays)),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Calendar API error ${res.status}`)
  }

  const data = await res.json()
  return data.id
}

export async function updateCalendarEvent(accessToken, eventId, { title, description, dueDate, earlyReminderDays = 0 }) {
  const res = await fetch(`${BASE_URL}/${eventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildEventBody(title, description, dueDate, earlyReminderDays)),
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
