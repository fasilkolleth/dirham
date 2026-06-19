import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Header } from '@/components/layout/Header'
import EMIPage from './EMI'
import BankBalancesPage from './BankBalances'
import LendingPage from './Lending'
import BorrowingPage from './Borrowing'
import { cn } from '@/utils/cn'

const TABS = [
  { id: 'bank', label: 'Bank Balances' },
  { id: 'emi', label: 'EMI Tracker' },
  { id: 'lending', label: 'Lending' },
  { id: 'borrowing', label: 'Borrowing' },
]

export default function TrackersPage() {
  const location = useLocation()
  const initialTab = TABS.some(t => t.id === location.state?.tab) ? location.state.tab : 'bank'
  const [tab, setTab] = useState(initialTab)

  return (
    <Layout>
      <Header title="Trackers" />

      <div className="px-4 md:px-8 pt-2 md:pt-4 pb-0">
        {/* Mobile: segment control */}
        <div className="md:hidden segment-control flex gap-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 h-8 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-200',
                tab === t.id
                  ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-2)]'
              )}
            >
              {t.id === 'emi' ? 'EMIs' : t.id === 'bank' ? 'Bank' : t.id === 'lending' ? 'Lending' : 'Borrowing'}
            </button>
          ))}
        </div>

        {/* Desktop: underline tab bar */}
        <div className="hidden md:flex gap-0 border-b border-[var(--border)]">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
                tab === t.id
                  ? 'border-[var(--accent)] text-[var(--accent-text)]'
                  : 'border-transparent text-[var(--text-2)] hover:text-[var(--text-1)]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'emi' && <EMIPage />}
      {tab === 'bank' && <BankBalancesPage />}
      {tab === 'lending' && <LendingPage />}
      {tab === 'borrowing' && <BorrowingPage />}
    </Layout>
  )
}
