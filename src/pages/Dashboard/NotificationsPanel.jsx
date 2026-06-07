import { Bell, BellOff, X } from 'lucide-react'
import { useAlerts } from '@/hooks/useAlerts'
import { formatDate } from '@/utils/dateHelpers'
import { cn } from '@/utils/cn'

const severityStyle = {
  high:   { card: 'bg-[var(--danger-bg)] border-[var(--danger-border)]',   text: 'text-[var(--danger)]' },
  medium: { card: 'bg-[var(--warning-bg)] border-[var(--warning-border)]', text: 'text-[var(--warning)]' },
  low:    { card: 'bg-[var(--info-bg)] border-[var(--info-border)]',       text: 'text-[var(--info)]' },
}
// Positive events (rent in, loan ending, repayment owed to you) read green.
const positiveStyle = { card: 'bg-[var(--success-bg)] border-[var(--success-border)]', text: 'text-[var(--success)]' }

export function NotificationsPanel({ onClose }) {
  const { alerts } = useAlerts()

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        aria-label="Close notifications"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 animate-fade-in"
      />

      {/* Panel — full screen on mobile, right drawer on desktop */}
      <div className="relative w-full md:max-w-[400px] h-full bg-[var(--bg)] flex flex-col shadow-[var(--shadow-lg)] animate-slide-in-right">

        {/* Header — safe-area inset on the outer wrapper so the dynamic island
            never overlaps the header row (which keeps its fixed height). */}
        <div className="page-header pt-[calc(env(safe-area-inset-top,0px)+8px)] shrink-0">
          <div className="px-4 md:px-5 h-14 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-light)] flex items-center justify-center shrink-0 text-[var(--accent-text)]">
              <Bell size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-1)]">Notifications</p>
              <p className="text-xs text-[var(--text-3)]">
                {alerts.length > 0 ? `${alerts.length} item${alerts.length !== 1 ? 's' : ''} need attention` : 'You’re all caught up'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 pb-safe">
          {alerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-16">
              <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4 text-[var(--text-3)]">
                <BellOff size={22} />
              </div>
              <p className="text-sm font-semibold text-[var(--text-1)]">No notifications</p>
              <p className="text-xs text-[var(--text-3)] mt-1 leading-relaxed">
                Upcoming EMIs, cheques, contracts and repayments will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => {
                const s = alert.tone === 'positive' ? positiveStyle : (severityStyle[alert.severity] || severityStyle.low)
                return (
                  <div
                    key={alert.id}
                    className={cn('rounded-[var(--radius-lg)] border px-4 py-3', s.card)}
                  >
                    <p className={cn('text-sm font-semibold leading-tight', s.text)}>{alert.title}</p>
                    <p className={cn('text-xs mt-0.5 opacity-80', s.text)}>{alert.description}</p>
                    {alert.dueDate && (
                      <p className={cn('text-xs mt-1 opacity-60 font-medium', s.text)}>{formatDate(alert.dueDate)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
