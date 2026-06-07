import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/utils/cn'

const variants = {
  primary:     'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:opacity-90 shadow-[var(--shadow-xs)]',
  secondary:   'bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border)] hover:bg-[var(--surface-3)] active:opacity-80',
  ghost:       'text-[var(--accent-text)] hover:bg-[var(--accent-light)] active:opacity-80',
  destructive: 'bg-[var(--danger)] text-white hover:opacity-90 active:opacity-80 shadow-[var(--shadow-xs)]',
  outline:     'border border-[var(--border)] bg-transparent text-[var(--text-1)] hover:bg-[var(--surface-2)] active:opacity-80',
}

const sizes = {
  xs:   'h-7 px-2.5 text-xs rounded-[var(--radius-sm)] gap-1',
  sm:   'h-8 px-3.5 text-sm rounded-[var(--radius-md)] gap-1.5',
  md:   'h-9 px-4 text-sm rounded-[var(--radius-md)] gap-2',
  lg:   'h-11 px-5 text-[15px] rounded-[var(--radius-lg)] gap-2',
  icon: 'h-9 w-9 rounded-[var(--radius-md)]',
}

export function Button({ variant = 'primary', size = 'md', asChild, className, children, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150',
        'disabled:opacity-40 disabled:cursor-not-allowed select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}
