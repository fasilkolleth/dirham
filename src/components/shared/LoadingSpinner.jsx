import { cn } from '@/utils/cn'

export function LoadingSpinner({ className, size = 24 }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className="rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin"
        style={{ width: size, height: size }}
      />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <LoadingSpinner size={32} />
    </div>
  )
}
