const BASE_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

// Creates a calendar event with up to two reminders:
//   - earlyReminderDays: days before the due date (0 = skip early reminder)
//   - always adds a reminder on the due date itself at 9 AM
export async function createCalendarEvent(accessToken, { title, description, dueDate, earlyReminderDays = 0 }) {
  const overrides = [
    { method: 'popup', minutes: 0 }, // on the due date at event time
  ]
  if (earlyReminderDays > 0) {
    overrides.push({ method: 'popup', minutes: earlyReminderDays * 24 * 60 })
  }

  const body = {
    summary: title,
    description,
    start: { date: dueDate },     // all-day event on the due date
    end:   { date: dueDate },
    reminders: {
      useDefault: false,
      overrides,
    },
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Calendar API error ${res.status}`)
  }

  const data = await res.json()
  return data.id // Google Calendar event ID — save this to update/delete later
}

export async function updateCalendarEvent(accessToken, eventId, { title, description, dueDate, earlyReminderDays = 0 }) {
  const overrides = [{ method: 'popup', minutes: 0 }]
  if (earlyReminderDays > 0) {
    overrides.push({ method: 'popup', minutes: earlyReminderDays * 24 * 60 })
  }

  const body = {
    summary: title,
    description,
    start: { date: dueDate },
    end:   { date: dueDate },
    reminders: { useDefault: false, overrides },
  }

  const res = await fetch(`${BASE_URL}/${eventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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

  // 404 means already deleted — treat as success
  if (!res.ok && res.status !== 404) {
    throw new Error(`Calendar API error ${res.status}`)
  }
}
