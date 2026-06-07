import { NavLink } from 'react-router-dom'
import { LayoutDashboard, PiggyBank, Building2, BarChart3, Settings } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { LogoMark } from '@/components/shared/LogoMark'
import { cn } from '@/utils/cn'

const tabs = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/budget',     icon: PiggyBank,        label: 'Budget' },
  { to: '/properties', icon: Building2,        label: 'Properties' },
  { to: '/trackers',   icon: BarChart3,        label: 'Trackers' },
  { to: '/settings',   icon: Settings,         label: 'Settings' },
]

export function Sidebar() {
  const { user } = useAuth()

  return (
    <aside className="dark sidebar fixed left-0 top-0 h-full w-[248px] flex flex-col z-40">

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[64px] border-b border-[var(--border)] shrink-0">
        <div className="shrink-0" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,98,255,0.30))' }}>
          <LogoMark size={36} />
        </div>
        <span className="text-[16px] font-semibold text-[var(--text-1)] tracking-tight">Dirham</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 px-3.5 h-11 rounded-[var(--radius-md)]',
                'text-[14px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-[var(--sidebar-active-bg)] text-[var(--accent-text)]'
                  : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)]'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 inset-y-2.5 w-[3px] rounded-r-full bg-[var(--accent)]" />
                )}
                <Icon size={19} strokeWidth={isActive ? 2.4 : 1.9} className="shrink-0" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      {user && (
        <div className="px-2 pb-4 pt-3 border-t border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] transition-colors cursor-default">
            {user.photoURL ? (
              <img src={user.photoURL} className="w-7 h-7 rounded-full shrink-0 ring-1 ring-[var(--border)]" alt="" />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #0062FF 0%, #7C3AED 100%)' }}
              >
                {user.displayName?.[0] || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[var(--text-1)] truncate leading-tight">{user.displayName}</p>
              <p className="text-[11px] text-[var(--text-3)] truncate leading-tight mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
