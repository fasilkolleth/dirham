import { format, differenceInDays, differenceInMonths, addMonths, parseISO, isValid } from 'date-fns'

export const formatDate = (date) => {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date?.toDate ? date.toDate() : date
  if (!isValid(d)) return '—'
  return format(d, 'dd MMM yyyy')
}

export const formatMonthKey = (date = new Date()) => format(date, 'yyyy-MM')

export const parseMonthKey = (key) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

export const monthLabel = (key) => {
  const d = parseMonthKey(key)
  return format(d, 'MMMM yyyy')
}

export const toDateInput = (date) => {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date?.toDate ? date.toDate() : date
  if (!isValid(d)) return ''
  return format(d, 'yyyy-MM-dd')
}

export const fromDateInput = (str) => {
  if (!str) return null
  return parseISO(str)
}

export const daysUntil = (date) => {
  if (!date) return null
  const d = typeof date === 'string' ? parseISO(date) : date?.toDate ? date.toDate() : date
  if (!isValid(d)) return null
  return differenceInDays(d, new Date())
}

export const monthsRemaining = (endDate) => {
  if (!endDate) return 0
  const d = typeof endDate === 'string' ? parseISO(endDate) : endDate?.toDate ? endDate.toDate() : endDate
  if (!isValid(d)) return 0
  return Math.max(0, differenceInMonths(d, new Date()))
}

export const monthsElapsed = (startDate) => {
  if (!startDate) return 0
  const d = typeof startDate === 'string' ? parseISO(startDate) : startDate?.toDate ? startDate.toDate() : startDate
  if (!isValid(d)) return 0
  return Math.max(0, differenceInMonths(new Date(), d))
}

export const prevMonth = (key) => {
  const d = parseMonthKey(key)
  return formatMonthKey(addMonths(d, -1))
}

export const nextMonth = (key) => {
  const d = parseMonthKey(key)
  return formatMonthKey(addMonths(d, 1))
}

export const isCurrentMonth = (key) => key === formatMonthKey()

export const currentMonthKey = () => formatMonthKey()
