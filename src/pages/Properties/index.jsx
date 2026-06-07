import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Header } from '@/components/layout/Header'
import OwnedPropertyPage from './Owned'
import RentedPropertyPage from './Rented'
import { cn } from '@/utils/cn'

const TABS = [
  { id: 'owned', label: 'Owned Properties' },
  { id: 'rented', label: 'Rented Properties' },
]

export default function PropertiesPage() {
  const [tab, setTab] = useState('owned')

  return (
    <Layout>
      <Header title="Properties" />

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
              {t.id === 'owned' ? 'Owned' : 'Rented'}
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

      {tab === 'owned' && <OwnedPropertyPage />}
      {tab === 'rented' && <RentedPropertyPage />}
    </Layout>
  )
}
