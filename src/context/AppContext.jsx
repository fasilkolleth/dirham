import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSettings } from '@/services/firestore'
import { normCurrency } from '@/utils/currencies'

const AppContext = createContext(null)

export const DEFAULT_SETTINGS = {
  theme: 'light',
  currency: 'AED',
  preferredName: '',
  emiWarningMonths: 3,
  emiDueWarningDays: 5,
  chequeWarningDays: 7,
  ownedContractWarningDays: 60,
  rentedContractWarningDays: 60,
  lendingWarningDays: 7,
  dateFormat: 'DD MMM YYYY',
  // Google Calendar reminder defaults
  emiCalendar:            'early_and_due',
  emiDueCalendar:         'due_date',
  chequeCalendar:         'early_and_due',
  ownedContractCalendar:  'early_and_due',
  rentedContractCalendar: 'early_and_due',
  lendingCalendar:        'due_date',
}

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  // Active currency = which money "world" the app is scoped to. Persisted per
  // device; the whole app filters/formats to this until changed.
  const [activeCurrency, setActiveCurrencyState] = useState(() => normCurrency(localStorage.getItem('activeCurrency')))
  const setActiveCurrency = (c) => {
    const next = normCurrency(c)
    setActiveCurrencyState(next)
    localStorage.setItem('activeCurrency', next)
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const loadSettings = useCallback(async () => {
    try {
      const snap = await getSettings()
      if (snap.exists()) {
        const data = snap.data()
        setSettings({ ...DEFAULT_SETTINGS, ...data })
        if (data.theme) {
          setTheme(data.theme)
        }
      }
    } catch {
      // use defaults if offline
    }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return (
    <AppContext.Provider value={{ settings, setSettings, theme, toggleTheme, activeCurrency, setActiveCurrency, loadSettings }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
