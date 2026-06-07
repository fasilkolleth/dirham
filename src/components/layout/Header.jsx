import { cn } from '@/utils/cn'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LogoMark } from '@/components/shared/LogoMark'
import { CurrencySwitcher } from '@/components/shared/CurrencySwitcher'

export function Header({ title, subtitle, back, rightAction, className }) {
  const navigate = useNavigate()

  return (
    <header className={cn(
      // Extra breathing space above the title on mobile (on top of the safe-area inset)
      'page-header sticky top-0 z-30 px-4 md:px-8 pt-[calc(env(safe-area-inset-top,0px)+10px)] md:pt-[env(safe-area-inset-top,0px)]',
      className
    )}>
      <div className="flex items-center justify-between gap-2 h-14 md:h-[68px]">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {back ? (
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 -ml-2 flex items-center justify-center text-[var(--accent)] shrink-0 rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            // App mark in the mobile top bar (desktop has it in the sidebar)
            <div className="md:hidden shrink-0" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,98,255,0.25))' }}>
              <LogoMark size={34} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] md:text-[24px] font-bold text-[var(--text-1)] leading-tight truncate tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[12px] md:text-[13px] text-[var(--text-2)] mt-0.5 flex items-center gap-1 min-w-0">
                <CalendarDays size={12} className="text-[var(--text-3)] shrink-0" />
                <span className="truncate">{subtitle}</span>
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 ml-2 md:ml-4 flex items-center gap-2">
          <CurrencySwitcher />
          {rightAction}
        </div>
      </div>
    </header>
  )
}
