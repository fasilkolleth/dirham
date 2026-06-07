import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Bell, Wallet, TrendingUp, TrendingDown, PiggyBank, ChevronRight, Landmark } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { BankLogo } from '@/components/shared/BankLogo'
import { AIChat } from './AIChat'
import { NotificationsPanel } from './NotificationsPanel'
import { DueSoon } from './DueSoon'
import { useApp } from '@/context/AppContext'
import { normCurrency } from '@/utils/currencies'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useEMI } from '@/hooks/useEMI'
import { useBudget } from '@/hooks/useBudget'
import { useLending } from '@/hooks/useLending'
import { useAuth } from '@/context/AuthContext'
import { useAlerts } from '@/hooks/useAlerts'
import { formatCurrency } from '@/utils/currencyFormatter'
import { monthLabel, currentMonthKey } from '@/utils/dateHelpers'
import { cn } from '@/utils/cn'

export default function DashboardPage() {
  const [showChat, setShowChat] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings, activeCurrency } = useApp()
  const { accounts: allAccounts } = useBankAccounts()
  // Scope bank displays to the active currency (never sum across currencies).
  const accounts = allAccounts.filter(a => normCurrency(a.currency) === activeCurrency)
  const totalBalance = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)
  const { emis: allEmis } = useEMI()
  // Scope EMIs to the active currency (don't sum AED + INR EMIs).
  const emis = allEmis.filter(e => normCurrency(e.currency) === activeCurrency)
  const totalMonthlyEMI = emis.filter(e => e.status !== 'closed').reduce((s, e) => s + (e.monthlyAmount || 0), 0)
  const { budget } = useBudget()
  const { lendings: allLendings } = useLending()
  const lendings = allLendings.filter(l => normCurrency(l.currency) === activeCurrency)
  const { count: alertCount } = useAlerts()

  const monthKey = currentMonthKey()
  const budgetItems = budget?.items || []
  // "Budget Spent" should reflect outflow only — income items would otherwise inflate it.
  const expenseItems = budgetItems.filter(i => i.type === 'expense')
  const incomeItems = budgetItems.filter(i => i.type === 'income')
  const totalExpensePlanned = expenseItems.reduce((s, i) => s + (i.planned || 0), 0)
  const totalExpenseActual = expenseItems.reduce((s, i) => s + (i.actual || 0), 0)
  const totalIncomeActual = incomeItems.reduce((s, i) => s + (i.actual || 0), 0)
  const netActual = totalIncomeActual - totalExpenseActual
  const totalLentOut = lendings.filter(l => l.status !== 'settled').reduce((s, l) => s + (l.balanceRemaining || 0), 0)

  const name = settings.preferredName?.trim() || user?.displayName?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // 4th card is smart: show "Lent Out" only when there's an outstanding balance,
  // otherwise surface this month's net cash flow (a live, always-relevant number).
  const fourthCard = totalLentOut > 0
    ? {
        label: 'Lent Out',
        value: formatCurrency(totalLentOut, activeCurrency),
        sub: 'outstanding balance',
        icon: <PiggyBank size={16} />,
        valueColor: 'text-[var(--success)]',
        iconColor: 'text-[var(--success)]',
        iconBg: 'bg-[var(--success-bg)]',
        accentBar: '#16A34A',
        onClick: () => navigate('/trackers', { state: { tab: 'lending' } }),
      }
    : {
        label: 'Net This Month',
        value: netActual >= 0 ? formatCurrency(netActual, activeCurrency) : `-${formatCurrency(Math.abs(netActual), activeCurrency)}`,
        sub: netActual >= 0 ? 'income over expenses' : 'expenses over income',
        icon: <Wallet size={16} />,
        valueColor: netActual >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]',
        iconColor: netActual >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]',
        iconBg: netActual >= 0 ? 'bg-[var(--success-bg)]' : 'bg-[var(--danger-bg)]',
        accentBar: netActual >= 0 ? '#16A34A' : '#DC2626',
        onClick: () => navigate('/budget'),
      }

  const summaryCards = [
    {
      label: 'Bank Balance',
      value: formatCurrency(totalBalance, activeCurrency),
      sub: `${accounts.length} account${accounts.length !== 1 ? 's' : ''}`,
      icon: <Wallet size={16} />,
      valueColor: 'text-[var(--accent-text)]',
      iconColor: 'text-[var(--accent-text)]',
      iconBg: 'bg-[var(--accent-light)]',
      accentBar: '#0062FF',
      onClick: () => navigate('/trackers', { state: { tab: 'bank' } }),
    },
    {
      label: 'Monthly EMI',
      value: formatCurrency(totalMonthlyEMI, activeCurrency),
      sub: `${emis.filter(e => e.status !== 'closed').length} active EMIs`,
      icon: <TrendingDown size={16} />,
      valueColor: 'text-[var(--danger)]',
      iconColor: 'text-[var(--danger)]',
      iconBg: 'bg-[var(--danger-bg)]',
      accentBar: '#DC2626',
      onClick: () => navigate('/trackers', { state: { tab: 'emi' } }),
    },
    {
      label: 'Budget Spent',
      value: formatCurrency(totalExpenseActual, activeCurrency),
      sub: `of ${formatCurrency(totalExpensePlanned, activeCurrency)} planned`,
      icon: <TrendingUp size={16} />,
      valueColor: 'text-[var(--warning)]',
      iconColor: 'text-[var(--warning)]',
      iconBg: 'bg-[var(--warning-bg)]',
      accentBar: '#D97706',
      onClick: () => navigate('/budget'),
    },
    fourthCard,
  ]

  return (
    <Layout>
      <Header
        title={`${greeting}, ${name}`}
        subtitle={monthLabel(monthKey)}
        rightAction={
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(true)}
                aria-label="Notifications"
                className="w-9 h-9 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
              >
                <Bell size={17} />
              </button>
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--danger)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowChat(true)}
              className="hidden md:flex items-center gap-2 h-9 px-4 rounded-[var(--radius-lg)] text-white text-[13px] font-semibold transition-all active:scale-95 hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #0062FF 0%, #7C3AED 100%)',
                boxShadow: '0 2px 12px rgba(0, 98, 255, 0.30)',
              }}
            >
              <Bot size={14} />
              Ask AI
            </button>
          </div>
        }
      />

      <div className="px-4 md:px-8 pt-4 md:pt-6 pb-28 md:pb-6 space-y-6 animate-fade-in">

        {/* Summary Cards — 2 col mobile, 4 col desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {summaryCards.map(card => {
            const Tag = card.onClick ? 'button' : 'div'
            return (
            <Tag
              key={card.label}
              onClick={card.onClick}
              className={cn(
                'group text-left w-full bg-[var(--surface)] rounded-[var(--radius-lg)] border border-[var(--card-border)] shadow-[var(--shadow-card)] overflow-hidden transition-all duration-200',
                card.onClick && 'cursor-pointer hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[var(--shadow-card)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]'
              )}
            >
              <div className="px-4 md:px-5 pt-4 pb-4 md:pt-4.5 md:pb-4.5">
                {/* Label + icon */}
                <div className="flex items-start justify-between gap-2 mb-3 md:mb-3.5">
                  <p className="text-[10px] md:text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide leading-tight">{card.label}</p>
                  <div className={cn('w-7 h-7 md:w-8 md:h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0', card.iconBg, card.iconColor)}>
                    {card.icon}
                  </div>
                </div>
                <p className={cn('text-[20px] md:text-[26px] font-bold leading-none tracking-tight whitespace-nowrap', card.valueColor)}>{card.value}</p>
                {/* Sub with colored dot */}
                <div className="flex items-start gap-1.5 mt-2.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-[5px]" style={{ background: card.accentBar }} />
                  <span className="text-[11px] text-[var(--text-2)] leading-snug">{card.sub}</span>
                  {card.onClick && (
                    <ChevronRight
                      size={14}
                      className="ml-auto text-[var(--text-3)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                    />
                  )}
                </div>
              </div>
            </Tag>
            )
          })}
        </div>

        {/* Due Soon | Bank Accounts side by side. */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:items-stretch">
          <div className="md:col-span-3 md:order-1">
            <DueSoon onViewAll={() => setShowNotifications(true)} className="h-full" />
          </div>

          {accounts.length > 0 && (
            <div className="md:col-span-2 md:order-2">
              <Card className="h-full">
                <div className="flex flex-col h-full">
                  <div className="px-4 pt-4 pb-3 border-b border-[var(--border)] flex items-center gap-2">
                    <Landmark size={16} className="text-[var(--accent-text)]" />
                    <h2 className="text-[15px] font-semibold text-[var(--text-1)]">Bank Accounts</h2>
                  </div>
                  <div className="divide-y divide-[var(--border)] flex-1">
                    {accounts.map(acc => (
                      <div key={acc.id} className="px-4 py-3 flex items-center gap-3">
                        <BankLogo name={acc.bankName} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--text-1)] truncate">{acc.bankName}</p>
                          <p className="text-xs text-[var(--text-2)] capitalize">{acc.accountType}</p>
                        </div>
                        <p className="text-sm font-semibold text-[var(--accent-text)] shrink-0">{formatCurrency(acc.balance, activeCurrency)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between bg-[var(--surface-2)] border-t border-[var(--border)]">
                    <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide">Total</span>
                    <span className="text-sm font-bold text-[var(--text-1)]">{formatCurrency(totalBalance, activeCurrency)}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Mobile AI chat FAB */}
      <button
        onClick={() => setShowChat(true)}
        className="md:hidden fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 z-30 w-14 h-14 rounded-full text-white flex items-center justify-center active:scale-95 transition-transform"
        style={{
          background: 'linear-gradient(135deg, #0062FF 0%, #7C3AED 100%)',
          boxShadow: '0 4px 20px rgba(0, 98, 255, 0.35)',
        }}
      >
        <Bot size={22} />
      </button>

      {showChat && <AIChat onClose={() => setShowChat(false)} />}
      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
    </Layout>
  )
}
