import { AlertTriangle } from 'lucide-react'
import { useAlerts } from '@/hooks/useAlerts'
import { formatDate } from '@/utils/dateHelpers'
import { cn } from '@/utils/cn'

const severityStyle = {
  high:   { card: 'bg-[var(--danger-bg)] border-[var(--danger-border)]',   text: 'text-[var(--danger)]' },
  medium: { card: 'bg-[var(--warning-bg)] border-[var(--warning-border)]', text: 'text-[var(--warning)]' },
  low:    { card: 'bg-[var(--info-bg)] border-[var(--info-border)]',       text: 'text-[var(--info)]' },
}

export function UpcomingAlerts() {
  const { alerts } = useAlerts()

  if (!alerts.length) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={15} className="text-[var(--warning)] shrink-0" />
        <h2 className="text-[15px] font-semibold text-[var(--text-1)]">Upcoming Alerts</h2>
        <span className="ml-auto text-xs bg-[var(--warning-bg)] text-[var(--warning)] px-2 py-0.5 rounded-full font-semibold border border-[var(--warning-border)]">
          {alerts.length}
        </span>
      </div>
      <div className="space-y-2">
        {alerts.slice(0, 5).map(alert => {
          const s = severityStyle[alert.severity] || severityStyle.low
          return (
            <div
              key={alert.id}
              className={cn('rounded-[var(--radius-lg)] border px-4 py-3', s.card)}
            >
              <p className={cn('text-sm font-semibold leading-tight', s.text)}>{alert.title}</p>
              <p className={cn('text-xs mt-0.5 truncate opacity-80', s.text)}>{alert.description}</p>
              {alert.dueDate && (
                <p className={cn('text-xs mt-0.5 opacity-60', s.text)}>{formatDate(alert.dueDate)}</p>
              )}
            </div>
          )
        })}
        {alerts.length > 5 && (
          <p className="text-xs text-[var(--text-3)] text-center py-1">+{alerts.length - 5} more alerts</p>
        )}
      </div>
    </div>
  )
}

export function AlertBell() {
  const { count } = useAlerts()
  if (!count) return null
  return (
    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--danger)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  )
}
