import { cn } from '@/utils/cn'

const variants = {
  default:  'bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border)]',
  accent:   'bg-[var(--accent-light)] text-[var(--accent-text)] border-transparent',
  success:  'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]',
  warning:  'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]',
  danger:   'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)]',
  info:     'bg-[var(--info-bg)] text-[var(--info)] border-[var(--info-border)]',
  green:    'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]',
  orange:   'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]',
  red:      'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)]',
  blue:     'bg-[var(--info-bg)] text-[var(--info)] border-[var(--info-border)]',
  grey:     'bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border)]',
  purple:   'bg-[var(--accent-light)] text-[var(--accent-text)] border-transparent',
}

export function Badge({ variant = 'default', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-[var(--radius-full)]',
        'text-xs font-medium border whitespace-nowrap',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    active:           { variant: 'success', label: 'Active' },
    ending_soon:      { variant: 'warning', label: 'Ending Soon' },
    closed:           { variant: 'default', label: 'Closed' },
    pending:          { variant: 'warning', label: 'Pending' },
    cleared:          { variant: 'success', label: 'Cleared' },
    bounced:          { variant: 'danger',  label: 'Bounced' },
    settled:          { variant: 'default', label: 'Settled' },
    partially_repaid: { variant: 'warning', label: 'Partial' },
  }
  const cfg = map[status] || { variant: 'default', label: status }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
