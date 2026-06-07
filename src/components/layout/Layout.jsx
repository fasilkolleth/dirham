import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { cn } from '@/utils/cn'

export function Layout({ children, className }) {
  return (
    <div className={cn('min-h-dvh bg-[var(--bg)]', className)}>
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="md:ml-[248px] pb-[calc(68px+env(safe-area-inset-bottom,0px))] md:pb-0 min-h-dvh">
        {children}
      </main>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
