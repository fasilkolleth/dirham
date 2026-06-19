import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/hooks/useSettings'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/services/googleCalendar'
import { toDateInput } from '@/utils/dateHelpers'
import toast from 'react-hot-toast'

const CALENDAR_SETTING_DEFAULTS = {
  emiCalendar:            'early_and_due',
  emiDueCalendar:         'due_date',
  chequeCalendar:         'early_and_due',
  ownedContractCalendar:  'early_and_due',
  rentedContractCalendar: 'early_and_due',
  lendingCalendar:        'due_date',
}

// Days to use for the early reminder based on the category type
function getEarlyDays(type, settings) {
  const map = {
    emi:            (settings.emiWarningMonths    || 3)  * 30,
    cheque:          settings.chequeWarningDays   || 7,
    ownedContract:   settings.ownedContractWarningDays  || 60,
    rentedContract:  settings.rentedContractWarningDays || 60,
    lending:         settings.lendingWarningDays  || 7,
  }
  return map[type] || 0
}

// Central hook for syncing records to Google Calendar.
//
// sync()   — create or update a calendar event. Returns:
//              string  → new/existing event ID (save this to Firestore)
//              null    → setting is 'off', event deleted if one existed
//              undefined → error or not applicable (don't overwrite stored ID)
//
// remove() — delete a calendar event by ID (e.g. when a record is deleted).
export function useCalendarSync() {
  const { calendarToken } = useAuth()
  const { settings } = useSettings()

  const sync = async ({ type, title, description = '', dueDate, existingEventId = null }) => {
    if (!calendarToken) return undefined

    const calSetting = settings[`${type}Calendar`] ?? CALENDAR_SETTING_DEFAULTS[`${type}Calendar`] ?? 'off'

    // Setting is off — delete existing event if any
    if (!calSetting || calSetting === 'off') {
      if (existingEventId) {
        await deleteCalendarEvent(calendarToken, existingEventId).catch(() => {})
      }
      return null
    }

    const dueDateStr = toDateInput(dueDate)
    if (!dueDateStr) return undefined

    const earlyReminderDays = calSetting === 'early_and_due' ? getEarlyDays(type, settings) : 0

    try {
      if (existingEventId) {
        await updateCalendarEvent(calendarToken, existingEventId, { title, description, dueDate: dueDateStr, earlyReminderDays })
        return existingEventId
      } else {
        return await createCalendarEvent(calendarToken, { title, description, dueDate: dueDateStr, earlyReminderDays })
      }
    } catch (err) {
      if (err.message?.includes('401') || err.message?.includes('403')) {
        toast.error('Google Calendar session expired. Go to Settings → reconnect.', { duration: 4000 })
      }
      return undefined
    }
  }

  const remove = async (eventId) => {
    if (!calendarToken || !eventId) return
    await deleteCalendarEvent(calendarToken, eventId).catch(() => {})
  }

  return { sync, remove, isConnected: !!calendarToken }
}
