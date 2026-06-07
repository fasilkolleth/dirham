import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'
import { formatCurrency } from '@/utils/currencyFormatter'
import { cn } from '@/utils/cn'

// Cash-flow summary shown at the foot of the Budget Overview (Dashboard) and the
// combined ledger (Budget page). Three stats, airy, no dividers — Net is colored
// by sign. See [[project-budget-conventions]].
export function BudgetSummaryFooter({ income, expenses, net, currency, className }) {
  const isDeficit = net < 0

  const stats = [
    {
      label: 'Income',
      value: formatCurrency(income, currency),
      valueClass: 'text-[var(--success)]',
      icon: <ArrowUpRight size={15} />,
      chip: 'bg-[var(--success-bg)] text-[var(--success)]',
    },
    {
      label: 'Expenses',
      value: formatCurrency(expenses, currency),
      valueClass: 'text-[var(--text-1)]',
      icon: <ArrowDownRight size={15} />,
      chip: 'bg-[var(--surface-3)] text-[var(--text-2)]',
    },
    {
      label: isDeficit ? 'Net Deficit' : 'Net Savings',
      value: net >= 0 ? formatCurrency(net, currency) : `-${formatCurrency(Math.abs(net), currency)}`,
      valueClass: isDeficit ? 'text-[var(--danger)]' : 'text-[var(--success)]',
      icon: <Wallet size={15} />,
      chip: isDeficit ? 'bg-[var(--danger-bg)] text-[var(--danger)]' : 'bg-[var(--success-bg)] text-[var(--success)]',
    },
  ]

  return (
    <div className={cn('bg-[var(--surface-2)] border-t border-[var(--border)]', className)}>
      {/* Desktop — three across, separated by whitespace */}
      <div className="hidden md:flex items-center justify-between gap-6 px-6 py-4">
        {stats.map(s => (
          <div key={s.label} className="flex items-center gap-3 min-w-0">
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', s.chip)}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)] mb-0.5">{s.label}</p>
              <p className={cn('text-[18px] font-bold leading-none tracking-tight truncate', s.valueClass)}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile — stacked rows */}
      <div className="md:hidden px-4 py-3 space-y-2.5">
        {stats.map(s => (
          <div key={s.label} className="flex items-center gap-2.5">
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', s.chip)}>
              {s.icon}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">{s.label}</span>
            <span className={cn('ml-auto text-sm font-bold', s.valueClass)}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
