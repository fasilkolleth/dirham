import { NavLink } from 'react-router-dom'
import { LayoutDashboard, PiggyBank, Building2, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/utils/cn'

const tabs = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/budget',     icon: PiggyBank,        label: 'Budget' },
  { to: '/properties', icon: Building2,        label: 'Properties' },
  { to: '/trackers',   icon: BarChart3,        label: 'Trackers' },
  { to: '/settings',   icon: Settings,         label: 'Settings' },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-40 pb-safe">
      <div className="flex items-stretch h-[60px]">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex-1 flex flex-col items-center justify-center gap-0.5"
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'flex items-center justify-center w-11 h-7 rounded-full transition-all duration-200',
                    isActive ? 'bg-[var(--accent-light)]' : ''
                  )}
                >
                  <Icon
                    size={19}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={isActive ? 'text-[var(--accent-text)]' : 'text-[var(--text-3)]'}
                  />
                </div>
                <span
                  className={cn(
                    'text-[9.5px] font-medium leading-none',
                    isActive ? 'text-[var(--accent-text)]' : 'text-[var(--text-3)]'
                  )}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
