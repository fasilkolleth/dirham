import { cn } from '@/utils/cn'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'bg-[var(--surface)] border border-[var(--card-border)] rounded-[var(--radius-lg)]',
        'shadow-[var(--shadow-card)] overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }) {
  return (
    <div className={cn('px-5 pt-5 pb-3', className)}>{children}</div>
  )
}

export function CardContent({ className, children }) {
  return (
    <div className={cn('px-5 pb-5', className)}>{children}</div>
  )
}

export function CardTitle({ className, children }) {
  return (
    <h3 className={cn('text-sm font-semibold text-[var(--text-1)]', className)}>{children}</h3>
  )
}

export function CardDivider() {
  return <div className="border-t border-[var(--border)]" />
}

export function SummaryCard({ label, value, sublabel, icon, accentColor, className }) {
  return (
    <Card className={cn('flex-1 min-w-0', className)}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="section-label mb-2">{label}</p>
            <p className={cn('text-2xl font-bold tracking-tight truncate', accentColor || 'text-[var(--text-1)]')}>
              {value}
            </p>
            {sublabel && (
              <p className="text-xs text-[var(--text-3)] mt-1">{sublabel}</p>
            )}
          </div>
          {icon && (
            <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center bg-[var(--surface-2)] shrink-0">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
