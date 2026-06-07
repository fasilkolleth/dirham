import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { generateMonthlySummary, buildFinancialContext } from '@/services/ai'
import { cn } from '@/utils/cn'

// Generated once per month and cached for the session, so navigating back to the
// dashboard (or a dev hot-reload) doesn't re-hit Gemini and trip its rate limit.
const monthKey = (() => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}` })()
const CACHE_KEY = `dirham-insights-${monthKey}`
const autoRequested = new Set() // guards the auto-fetch against StrictMode/remounts

export function AIInsights({ budget, emis, accounts, lendings, ownedProperties, rentedProperties }) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const context = buildFinancialContext({ budget, emis, bankAccounts: accounts, lending: lendings, ownedProperties, rentedProperties })
      const text = await generateMonthlySummary(context)
      setSummary(text)
      try { sessionStorage.setItem(CACHE_KEY, text) } catch { /* ignore quota */ }
    } catch (e) {
      if (e?.code === 'no_key') setError('Add your Gemini API key (VITE_GEMINI_API_KEY) to enable monthly insights.')
      else if (e?.code === 'rate_limit') setError('Gemini rate limit reached — try again in a minute.')
      else if (e?.code === 'auth') setError('Your Gemini API key looks invalid. Check VITE_GEMINI_API_KEY.')
      else setError('Couldn’t generate insights right now. Tap refresh to retry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const cached = (() => { try { return sessionStorage.getItem(CACHE_KEY) } catch { return null } })()
    if (cached) { setSummary(cached); return }
    if (autoRequested.has(monthKey)) return // already auto-fetched this session
    if (accounts?.length || emis?.length) {
      autoRequested.add(monthKey)
      generate()
    }
  }, [])

  // Only wear the bold gradient when there's an actual insight to show —
  // an error / empty placeholder shouldn't be the loudest thing on the page.
  const hero = !!summary && !error

  return (
    <Card
      className="overflow-hidden"
      style={hero ? { background: 'linear-gradient(135deg, #0062FF 0%, #7C3AED 100%)', border: 'none', boxShadow: '0 8px 32px rgba(0, 98, 255, 0.25)' } : undefined}
    >
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className={hero ? 'text-white' : 'text-[var(--accent-text)]'} />
            <span className={cn('text-sm font-semibold', hero ? 'text-white' : 'text-[var(--text-1)]')}>Monthly Insights</span>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center transition-colors disabled:opacity-50',
              hero ? 'text-white' : 'text-[var(--text-3)] bg-[var(--surface-2)] hover:text-[var(--accent-text)]'
            )}
            style={hero ? { background: 'rgba(255,255,255,0.18)' } : undefined}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className={cn('flex items-center gap-2 text-sm', !hero && 'text-[var(--text-2)]')} style={hero ? { color: 'rgba(255,255,255,0.70)' } : undefined}>
            <div
              className="w-4 h-4 rounded-full border-2 animate-spin"
              style={hero
                ? { borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }
                : { borderColor: 'var(--surface-3)', borderTopColor: 'var(--accent)' }}
            />
            <span>Analysing your finances…</span>
          </div>
        ) : error ? (
          <p className="text-sm text-[var(--text-3)] leading-relaxed">{error}</p>
        ) : summary ? (
          <p className="text-sm text-white leading-relaxed">{summary}</p>
        ) : (
          <p className="text-sm text-[var(--text-3)]">Tap refresh to generate your monthly summary.</p>
        )}
      </CardContent>
    </Card>
  )
}
