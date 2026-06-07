import { cn } from '@/utils/cn'

export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {icon && (
        <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--surface-2)] flex items-center justify-center mb-4 text-[var(--text-3)]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--text-1)] mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--text-2)] mb-5 max-w-xs leading-relaxed">{description}</p>}
      {action}
    </div>
  )
}
