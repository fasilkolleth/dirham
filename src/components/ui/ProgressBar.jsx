import { cn } from '@/utils/cn'

// Fixed colours, used when the caller wants the bar to reflect an explicit
// status (via `tone`) rather than the value/max ratio.
const TONE_COLORS = {
  accent:  'bg-[var(--accent)]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger:  'bg-[var(--danger)]',
  info:    'bg-[var(--info)]',
}

export function ProgressBar({ value = 0, max = 100, kind, tone, className }) {
  const ratio = max > 0 ? value / max : 0
  const pct = Math.min(100, Math.max(0, ratio * 100))

  // An explicit `tone` wins — the bar shows a fixed status colour.
  // Otherwise colour reflects status, not just fullness. The `kind` prop tunes the meaning:
  //  • income  → reaching/beating the target is GOOD: green once met, blue while building.
  //  • expense → spending money: amber while within budget, green when fully used/paid,
  //              red only when genuinely over budget.
  //  • default → mixed/generic ramp (used elsewhere, e.g. the dashboard).
  let color
  if (tone && TONE_COLORS[tone]) {
    color = TONE_COLORS[tone]
  } else if (kind === 'income') {
    color = ratio >= 1 ? 'bg-[var(--success)]' : 'bg-[var(--accent)]'
  } else if (kind === 'expense') {
    color = ratio > 1 ? 'bg-[var(--danger)]' : ratio >= 1 ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
  } else {
    color =
      ratio > 1
        ? 'bg-[var(--danger)]'
        : ratio >= 1
        ? 'bg-[var(--success)]'
        : ratio >= 0.8
        ? 'bg-[var(--warning)]'
        : 'bg-[var(--accent)]'
  }

  return (
    <div className={cn('w-full h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500 ease-out', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
