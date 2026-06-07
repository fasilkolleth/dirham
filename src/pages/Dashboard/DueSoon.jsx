import { Clock, ChevronRight, BellOff, CalendarClock, Receipt, FileText, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { useAlerts } from '@/hooks/useAlerts'
import { daysUntil, formatDate } from '@/utils/dateHelpers'
import { cn } from '@/utils/cn'

const TYPE_ICON = { emi: CalendarClock, emi_due: CalendarClock, cheque: Receipt, contract: FileText, lending: Users }
// Where each alert lives, so a tap jumps straight to the right page.
const TYPE_ROUTE = { emi: '/trackers', emi_due: '/trackers', lending: '/trackers', cheque: '/properties', contract: '/properties' }

// Positive events (rent coming in, a loan ending, a repayment owed to you) read
// green; everything else is coloured by urgency (red → amber → blue).
const POSITIVE_CHIP = 'bg-[var(--success-bg)] text-[var(--success)]'
const SEVERITY_CHIP = {
  high:   'bg-[var(--danger-bg)] text-[var(--danger)]',
  medium: 'bg-[var(--warning-bg)] text-[var(--warning)]',
  low:    'bg-[var(--info-bg)] text-[var(--info)]',
}

const MAX_SHOWN = 4

// "What needs my attention soon" — upcoming EMIs, cheques, contracts, repayments.
// Sourced from the same alerts that feed the notifications panel.
export function DueSoon({ onViewAll, className }) {
  const { alerts } = useAlerts()
  const navigate = useNavigate()

  const sorted = [...alerts].sort((a, b) => (daysUntil(a.dueDate) ?? 9999) - (daysUntil(b.dueDate) ?? 9999))
  const shown = sorted.slice(0, MAX_SHOWN)

  return (
    <Card className={className}>
      <div className="px-4 md:px-6 pt-4 pb-3 border-b border-[var(--border)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={16} className={alerts.length ? 'text-[var(--warning)]' : 'text-[var(--success)]'} />
          <h2 className="text-[15px] font-semibold text-[var(--text-1)]">Due Soon</h2>
          {alerts.length > 0 && (
            <span className="text-[11px] font-bold text-[var(--warning)] bg-[var(--warning-bg)] border border-[var(--warning-border)] px-1.5 py-0.5 rounded-full leading-none">
              {alerts.length}
            </span>
          )}
        </div>
        {alerts.length > MAX_SHOWN && (
          <button
            onClick={onViewAll}
            className="shrink-0 flex items-center gap-0.5 text-xs font-semibold text-[var(--accent-text)] hover:opacity-80 transition-opacity"
          >
            View all <ChevronRight size={13} />
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="px-4 md:px-6 py-8 flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[var(--success-bg)] flex items-center justify-center text-[var(--success)]">
            <BellOff size={18} />
          </div>
          <p className="text-sm font-medium text-[var(--text-1)]">Nothing due soon</p>
          <p className="text-xs text-[var(--text-3)] leading-relaxed">Upcoming EMIs, cheques, contracts and repayments will show up here.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {shown.map(alert => {
            const Icon = TYPE_ICON[alert.type] || Clock
            const chip = alert.tone === 'positive' ? POSITIVE_CHIP : (SEVERITY_CHIP[alert.severity] || SEVERITY_CHIP.low)
            const route = TYPE_ROUTE[alert.type]
            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => route && navigate(route)}
                disabled={!route}
                className="group w-full text-left px-4 md:px-6 py-3 flex items-center gap-3 transition-colors enabled:hover:bg-[var(--surface-2)] disabled:cursor-default"
              >
                <div className={cn('w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0', chip)}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-1)] truncate">{alert.title}</p>
                  <p className="text-xs text-[var(--text-2)] truncate">{alert.description}</p>
                </div>
                {alert.dueDate && (
                  <span className="shrink-0 text-[11px] font-medium text-[var(--text-3)]">{formatDate(alert.dueDate)}</span>
                )}
                {route && (
                  <ChevronRight size={14} className="shrink-0 text-[var(--text-3)] opacity-40 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}
