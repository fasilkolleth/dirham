import { useApp } from '@/context/AppContext'
import { CURRENCIES } from '@/utils/currencies'
import { cn } from '@/utils/cn'

// Global segmented control that scopes the whole app to one currency "world".
// Hidden automatically if only one currency is configured.
export function CurrencySwitcher() {
  const { activeCurrency, setActiveCurrency } = useApp()
  if (CURRENCIES.length < 2) return null

  return (
    <div className="inline-flex items-center rounded-[var(--radius-md)] bg-[var(--surface-2)] p-0.5 shrink-0">
      {CURRENCIES.map(c => (
        <button
          key={c.code}
          onClick={() => setActiveCurrency(c.code)}
          aria-pressed={activeCurrency === c.code}
          className={cn(
            'inline-flex items-center gap-1.5 px-2 sm:px-2.5 h-7 rounded-[calc(var(--radius-md)-2px)] text-xs font-semibold transition-colors',
            activeCurrency === c.code
              ? 'bg-[var(--surface)] text-[var(--accent-text)] shadow-[var(--shadow-xs)]'
              : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
          )}
        >
          <span className="text-[13px] leading-none">{c.flag}</span>
          <span className="hidden sm:inline">{c.label}</span>
        </button>
      ))}
    </div>
  )
}
