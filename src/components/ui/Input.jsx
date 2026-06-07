import { cn } from '@/utils/cn'
import { forwardRef } from 'react'

const fieldBase = cn(
  'w-full min-w-0 bg-[var(--surface)] text-[var(--text-1)]',
  'border border-[var(--border)] rounded-[var(--radius-md)]',
  'placeholder:text-[var(--text-3)]',
  'transition-all duration-150',
  'focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-15',
  'disabled:opacity-40 disabled:cursor-not-allowed',
)

export const Input = forwardRef(({ className, label, hint, error, ...props }, ref) => (
  <div className="flex flex-col gap-1.5 min-w-0">
    {label && (
      <label className="text-xs font-medium text-[var(--text-2)]">{label}</label>
    )}
    <input
      ref={ref}
      className={cn(fieldBase, 'h-10 px-3 text-sm', error && 'border-[var(--danger)] focus:ring-[var(--danger)]', className)}
      {...props}
    />
    {hint && !error && <p className="text-xs text-[var(--text-3)]">{hint}</p>}
    {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
  </div>
))
Input.displayName = 'Input'

export const Textarea = forwardRef(({ className, label, hint, error, ...props }, ref) => (
  <div className="flex flex-col gap-1.5 min-w-0">
    {label && (
      <label className="text-xs font-medium text-[var(--text-2)]">{label}</label>
    )}
    <textarea
      ref={ref}
      className={cn(fieldBase, 'px-3 py-2.5 text-sm resize-none', error && 'border-[var(--danger)]', className)}
      {...props}
    />
    {hint && !error && <p className="text-xs text-[var(--text-3)]">{hint}</p>}
    {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
  </div>
))
Textarea.displayName = 'Textarea'

export const Select = forwardRef(({ className, label, hint, error, children, ...props }, ref) => (
  <div className="flex flex-col gap-1.5 min-w-0">
    {label && (
      <label className="text-xs font-medium text-[var(--text-2)]">{label}</label>
    )}
    <select
      ref={ref}
      className={cn(fieldBase, 'h-10 px-3 text-sm cursor-pointer', error && 'border-[var(--danger)]', className)}
      {...props}
    >
      {children}
    </select>
    {hint && !error && <p className="text-xs text-[var(--text-3)]">{hint}</p>}
    {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
  </div>
))
Select.displayName = 'Select'
