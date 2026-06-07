import { Plus } from 'lucide-react'
import { cn } from '@/utils/cn'

export function FAB({ onClick, className, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 z-30',
        'w-14 h-14 rounded-full',
        'flex items-center justify-center',
        'active:scale-95 transition-transform duration-150',
        className
      )}
      style={{
        background: 'linear-gradient(135deg, var(--accent) 0%, #7C3AED 100%)',
        boxShadow: '0 4px 20px rgba(0, 98, 255, 0.35)',
        color: 'white',
      }}
      aria-label={label || 'Add'}
    >
      <Plus size={24} strokeWidth={2.5} />
    </button>
  )
}
