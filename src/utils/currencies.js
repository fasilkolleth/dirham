// Single source of truth for the currencies the app supports. Adding another
// currency later is just one more entry here (+ a formatCurrency locale).
export const CURRENCIES = [
  { code: 'AED', label: 'AED', locale: 'en-AE', symbol: 'AED', flag: '🇦🇪' },
  { code: 'INR', label: 'INR', locale: 'en-IN', symbol: '₹',   flag: '🇮🇳' },
]

// Look up a currency's config (falls back to the default currency's entry).
export const currencyMeta = (code) =>
  CURRENCIES.find(c => c.code === code) || CURRENCIES[0]

export const CURRENCY_CODES = CURRENCIES.map(c => c.code)
export const DEFAULT_CURRENCY = 'AED'

// Normalize any stored value (missing/legacy → default). Every money record
// treats an absent currency as the default, so existing data needs no backfill.
export const normCurrency = (c) => (CURRENCY_CODES.includes(c) ? c : DEFAULT_CURRENCY)
