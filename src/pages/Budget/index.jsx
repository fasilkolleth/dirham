import { useState } from 'react'
import {
  ChevronLeft, ChevronRight, Pencil, Trash2, Check, X,
  PiggyBank, Plus, StickyNote, AlertTriangle, Clock, Landmark, Search, CheckCircle2,
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { BudgetSummaryFooter } from '@/components/shared/BudgetSummaryFooter'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { EmptyState } from '@/components/shared/EmptyState'
import { FAB } from '@/components/shared/FAB'
import { useBudget } from '@/hooks/useBudget'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useApp } from '@/context/AppContext'
import { formatCurrency } from '@/utils/currencyFormatter'
import { normCurrency } from '@/utils/currencies'
import { monthLabel, currentMonthKey, prevMonth, nextMonth, isCurrentMonth } from '@/utils/dateHelpers'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

const BLANK_ITEM = { category: '', type: 'expense', planned: '', actual: '', notes: '', accountId: '' }

export default function BudgetPage() {
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(BLANK_ITEM)
  const [saving, setSaving] = useState(false)
  const [editActual, setEditActual] = useState(null)
  const [actualInput, setActualInput] = useState('')

  const { budget, isLoading, template, saveMutation, initFromTemplate } = useBudget(monthKey)
  const { accounts: allAccounts } = useBankAccounts()
  const { activeCurrency: cur } = useApp()
  // Budget items can only link to accounts of the same currency world.
  const accounts = allAccounts.filter(a => normCurrency(a.currency) === cur)

  const items = budget?.items || []
  const income   = items.filter(i => i.type === 'income')
  const expenses = items.filter(i => i.type === 'expense')
  const totalIncome      = income.reduce((s, i)   => s + Number(i.actual  || 0), 0)
  const totalExpenses    = expenses.reduce((s, i)  => s + Number(i.actual  || 0), 0)
  const totalPlannedExp  = expenses.reduce((s, i)  => s + Number(i.planned || 0), 0)
  const net = totalIncome - totalExpenses
  // Expenses first, income listed below them.
  const orderedItems = [...expenses, ...income]

  const openAdd  = () => { setForm(BLANK_ITEM); setEditingItem(null); setShowForm(true) }
  const openEdit = (item) => {
    setForm({ ...item, planned: String(item.planned || ''), actual: String(item.actual || '') })
    setEditingItem(item.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.category.trim()) return toast.error('Enter a category name')
    setSaving(true)
    try {
      let newItems
      if (editingItem) {
        newItems = items.map(i =>
          i.id === editingItem
            ? { ...i, ...form, planned: Number(form.planned) || 0, actual: Number(form.actual) || 0 }
            : i
        )
      } else {
        newItems = [...items, { ...form, id: crypto.randomUUID(), planned: Number(form.planned) || 0, actual: Number(form.actual) || 0 }]
      }
      await saveMutation.mutateAsync({ items: newItems, month: monthKey })
      setShowForm(false)
      toast.success(editingItem ? 'Updated' : 'Added')
    } catch (err) { console.error(err); toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    await saveMutation.mutateAsync({ items: items.filter(i => i.id !== id), month: monthKey })
    toast.success('Removed')
  }

  const saveActual = async (itemId) => {
    const newItems = items.map(i => i.id === itemId ? { ...i, actual: Number(actualInput) || 0 } : i)
    await saveMutation.mutateAsync({ items: newItems, month: monthKey })
    setEditActual(null)
    toast.success('Updated')
  }

  const handleLoadTemplate = async () => {
    const result = await initFromTemplate()
    if (result.added === 0) {
      toast('All template items already exist in this month\'s budget', { icon: '✓' })
    } else {
      const msg = result.skipped > 0
        ? `Added ${result.added} new item${result.added !== 1 ? 's' : ''} · ${result.skipped} already existed`
        : `Added ${result.added} item${result.added !== 1 ? 's' : ''} from template`
      toast.success(msg)
    }
  }

  const monthNav = (
    <div className="flex items-center gap-1">
      <button onClick={() => setMonthKey(prevMonth(monthKey))} className="w-8 h-8 flex items-center justify-center text-[var(--accent-text)] rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] transition-colors">
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-medium text-[var(--text-2)] min-w-[88px] md:min-w-[100px] text-center">{monthLabel(monthKey)}</span>
      <button onClick={() => setMonthKey(nextMonth(monthKey))} disabled={isCurrentMonth(monthKey)} className="w-8 h-8 flex items-center justify-center text-[var(--accent-text)] rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-30">
        <ChevronRight size={18} />
      </button>
    </div>
  )

  return (
    <Layout>
      <Header
        title="Budget"
        rightAction={
          <div className="flex items-center gap-2 md:gap-3">
            {monthNav}
            <Button onClick={openAdd} size="sm" className="hidden md:flex gap-1.5">
              <Plus size={14} /> Add Item
            </Button>
          </div>
        }
      />

      <div className="px-4 md:px-8 pt-4 md:pt-6 pb-28 md:pb-6 space-y-6 animate-fade-in">

        {/* ── Empty State ─────────────────────────────────────────────── */}
        {!isLoading && items.length === 0 && (
          <EmptyState
            icon={<PiggyBank size={26} />}
            title="No budget yet"
            description={`Set up your budget for ${monthLabel(monthKey)}`}
            action={
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {template?.items?.length > 0 && (
                  <Button onClick={handleLoadTemplate} className="w-full">
                    Load from Template
                  </Button>
                )}
                <Button variant="secondary" onClick={openAdd} className="w-full">Add Manually</Button>
              </div>
            }
          />
        )}

        {/* ── Main Content: Tables + Summary Panel ───────────────────── */}
        {items.length > 0 && (
          <>
            {/* Mobile: surface the action list at the top so it isn't missed */}
            <RemainingToPay items={items} currency={cur} className="md:hidden" />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-5 md:gap-6">

            {/* Left: Combined ledger (matches Dashboard Budget Overview) */}
            <div className="md:col-span-3 space-y-6">
              <BudgetLedger
                items={orderedItems} currency={cur}
                totalIncome={totalIncome} totalExpenses={totalExpenses} net={net}
                onEdit={openEdit} onDelete={handleDelete}
                editActual={editActual} actualInput={actualInput} setActualInput={setActualInput}
                onEditActual={(id, val) => { setEditActual(id); setActualInput(String(val || '')) }}
                onSaveActual={saveActual} onCancelActual={() => setEditActual(null)}
              />

              {/* Load from template button */}
              {template?.items?.length > 0 && (
                <Button variant="secondary" onClick={handleLoadTemplate} size="sm" className="gap-1.5">
                  <Plus size={13} /> Add Missing from Template
                </Button>
              )}
            </div>

            {/* Right: Budget Summary Panel */}
            <div className="md:col-span-2">
              <BudgetSummaryPanel
                items={items} currency={cur}
                totalPlannedExp={totalPlannedExp} totalExpenses={totalExpenses}
              />
            </div>

            </div>
          </>
        )}
      </div>

      <FAB onClick={openAdd} label="Add budget item" />

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingItem ? 'Edit Item' : 'Add Budget Item'}>
        <div className="space-y-4">
          <Input label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Groceries, Salary" />
          <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label={`Planned (${cur})`} type="number" value={form.planned} onChange={e => setForm(f => ({ ...f, planned: e.target.value }))} placeholder="0" />
            <Input label={`Actual (${cur})`} type="number" value={form.actual} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))} placeholder="0" />
          </div>
          {accounts.length > 0 && (
            <Select
              label={form.type === 'income' ? 'Receive into account (optional)' : 'Pay from account (optional)'}
              hint={`The actual amount ${form.type === 'income' ? 'is added to' : 'is deducted from'} this account's balance, and updates as you edit it. Leave blank for items already tracked elsewhere (don't link EMI or Rent).`}
              value={form.accountId || ''}
              onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
            >
              <option value="">— Don't touch any balance —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName}{a.accountType ? ` · ${a.accountType}` : ''}</option>)}
            </Select>
          )}
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Optional — payment reference, due date reminder, etc."
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}

/* ── Budget Ledger (combined income + expenses, matches Dashboard) ─────────── */

// Income: reaching/beating the target is GOOD (green surplus); falling short is
// just money yet to come (neutral). Expense: under budget is good (green), over
// budget is bad (red).
function remainingOf(item, currency) {
  const planned = Number(item.planned) || 0
  const actual = Number(item.actual) || 0
  const remaining = planned - actual
  if (item.type === 'income') {
    if (actual >= planned) {
      return { text: remaining === 0 ? formatCurrency(0, currency) : `+${formatCurrency(actual - planned, currency)}`, cls: 'text-[var(--success)]' }
    }
    return { text: formatCurrency(remaining, currency), cls: 'text-[var(--text-2)]' }
  }
  // Expense: over → red, fully paid → muted (calm), still owing → amber (stands out).
  if (remaining < 0) return { text: `-${formatCurrency(Math.abs(remaining), currency)}`, cls: 'text-[var(--danger)] font-medium' }
  if (remaining === 0) return { text: formatCurrency(0, currency), cls: 'text-[var(--text-3)]' }
  return { text: formatCurrency(remaining, currency), cls: 'text-[var(--warning)] font-semibold' }
}

const PILL_TONE = {
  green: 'bg-[var(--success-bg)] text-[var(--success)]',
  amber: 'bg-[var(--warning-bg)] text-[var(--warning)]',
  red:   'bg-[var(--danger-bg)] text-[var(--danger)]',
}

function StatusPill({ tone, icon: Icon, children }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', PILL_TONE[tone])}>
      {Icon && <Icon size={11} />}{children}
    </span>
  )
}

// Status of a budget line. Paid/Received → calm green pill; an expense with
// nothing paid yet → amber "Due" (so it stands out); over budget → red;
// partially paid → a slim bar (the one case where progress is informative).
function ItemProgress({ item }) {
  const planned = Number(item.planned) || 0
  const actual = Number(item.actual) || 0
  const income = item.type === 'income'
  const remaining = planned - actual

  if (planned > 0 && actual >= planned && !(item.type === 'expense' && remaining < 0)) {
    return <StatusPill tone="green" icon={CheckCircle2}>{income ? 'Received' : 'Paid'}</StatusPill>
  }
  if (item.type === 'expense' && remaining < 0) {
    return <StatusPill tone="red" icon={AlertTriangle}>Over</StatusPill>
  }
  if (item.type === 'expense' && actual <= 0 && planned > 0) {
    return <StatusPill tone="amber" icon={Clock}>Due</StatusPill>
  }
  return <ProgressBar value={actual} max={planned} kind={income ? 'income' : 'expense'} className="w-full" />
}

function BudgetLedger({
  items, currency, totalIncome, totalExpenses, net,
  onEdit, onDelete,
  editActual, actualInput, setActualInput,
  onEditActual, onSaveActual, onCancelActual,
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  // Search only filters which rows are shown; the footer totals stay on the full budget.
  const filtered = q
    ? items.filter(i => (i.category || '').toLowerCase().includes(q) || (i.notes || '').toLowerCase().includes(q))
    : items

  return (
    <Card>
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 border-b border-[var(--border)] flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-[var(--text-1)] shrink-0">Budget Overview</h2>
        <div className="relative w-full max-w-[150px] sm:max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full h-8 pl-7 pr-7 rounded-[var(--radius-md)] bg-[var(--surface-2)] text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none border border-transparent focus:border-[var(--accent)] transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              title="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block">
        <div className="px-6 py-2 grid grid-cols-12 gap-2 text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide border-b border-[var(--border)]">
          <span className="col-span-4">Category</span>
          <span className="col-span-2 text-right">Planned</span>
          <span className="col-span-2 text-right">Actual</span>
          <span className="col-span-2 text-right">Remaining</span>
          <span className="col-span-2">Progress</span>
        </div>

        {filtered.map(item => {
          const isIncome = item.type === 'income'
          const r = remainingOf(item, currency)
          return (
            <div key={item.id} className={cn(
              'group px-6 py-3 grid grid-cols-12 gap-2 items-center border-b border-[var(--border)] transition-colors',
              isIncome ? 'bg-[var(--success-bg)]' : 'hover:bg-[var(--surface-2)]'
            )}>
              {/* Category + note */}
              <div className="col-span-4 min-w-0">
                <div className="flex items-center gap-2.5">
                  <CategoryIcon name={item.category} type={item.type} />
                  <span className="text-sm font-medium text-[var(--text-1)] truncate">{item.category}</span>
                  {item.accountId && <Landmark size={11} className="text-[var(--accent-text)] shrink-0" title="Posts to a bank account" />}
                  {item.notes && <StickyNote size={11} className="text-[var(--warning)] shrink-0" />}
                </div>
                {item.notes && (
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5 italic leading-snug truncate pl-8">{item.notes}</p>
                )}
              </div>

              <span className="col-span-2 text-sm text-right text-[var(--text-2)]">{formatCurrency(item.planned, currency)}</span>

              {/* Actual — inline editable */}
              <div className="col-span-2 flex items-center justify-end gap-1.5">
                {editActual === item.id ? (
                  <>
                    <input
                      type="number"
                      value={actualInput}
                      onChange={e => setActualInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') onSaveActual(item.id); if (e.key === 'Escape') onCancelActual() }}
                      className="h-7 w-20 rounded-[var(--radius-md)] px-2 text-sm bg-[var(--surface)] text-[var(--text-1)] outline-none border border-[var(--accent)]"
                      autoFocus
                    />
                    <button onClick={() => onSaveActual(item.id)} className="text-[var(--success)]"><Check size={14} /></button>
                    <button onClick={onCancelActual} className="text-[var(--danger)]"><X size={14} /></button>
                  </>
                ) : (
                  <button
                    onClick={() => onEditActual(item.id, item.actual)}
                    className="text-sm font-medium text-[var(--text-1)] hover:text-[var(--accent-text)] transition-colors"
                  >
                    {formatCurrency(item.actual, currency)}
                  </button>
                )}
              </div>

              <span className={cn('col-span-2 text-sm text-right font-medium', r.cls)}>
                {r.text}
              </span>

              {/* Progress + actions */}
              <div className="col-span-2 flex items-center gap-2">
                <div className="flex-1 min-w-0"><ItemProgress item={item} /></div>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0 transition-opacity">
                  <button onClick={() => onEdit(item)} className="text-[var(--text-3)] hover:text-[var(--accent-text)] p-0.5 transition-colors"><Pencil size={12} /></button>
                  <button onClick={() => onDelete(item.id)} className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5 transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          )
        })}

      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden divide-y divide-[var(--border)]">
        {filtered.map(item => (
          <div key={item.id} className={cn('px-4 py-3', item.type === 'income' && 'bg-[var(--success-bg)]')}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <CategoryIcon name={item.category} type={item.type} />
                  <span className="text-sm font-medium text-[var(--text-1)] truncate">{item.category}</span>
                  {item.accountId && <Landmark size={11} className="text-[var(--accent-text)] shrink-0" title="Posts to a bank account" />}
                  {item.notes && <StickyNote size={11} className="text-[var(--warning)] shrink-0" />}
                </div>
                {item.notes && <p className="text-[11px] text-[var(--text-3)] italic mt-0.5 leading-snug pl-8">{item.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => onEdit(item)} className="text-[var(--text-2)] p-0.5"><Pencil size={14} /></button>
                <button onClick={() => onDelete(item.id)} className="text-[var(--danger)] p-0.5"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mb-2">
              {editActual === item.id ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <input type="number" value={actualInput} onChange={e => setActualInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSaveActual(item.id); if (e.key === 'Escape') onCancelActual() }} className="h-7 flex-1 rounded-[var(--radius-md)] px-2 text-sm bg-[var(--surface-2)] text-[var(--text-1)] outline-none border border-[var(--accent)]" autoFocus />
                  <button onClick={() => onSaveActual(item.id)} className="text-[var(--success)]"><Check size={15} /></button>
                  <button onClick={onCancelActual} className="text-[var(--danger)]"><X size={15} /></button>
                </div>
              ) : (
                <button onClick={() => onEditActual(item.id, item.actual)} className="text-left">
                  <span className="text-sm font-medium text-[var(--text-1)]">{formatCurrency(item.actual, currency)}</span>
                  <span className="text-xs text-[var(--text-2)]"> / {formatCurrency(item.planned, currency)}</span>
                </button>
              )}
            </div>
            <ItemProgress item={item} />
          </div>
        ))}
      </div>

      {q && filtered.length === 0 && (
        <div className="px-4 md:px-6 py-8 text-center text-sm text-[var(--text-3)]">No categories match “{query}”.</div>
      )}

      <BudgetSummaryFooter income={totalIncome} expenses={totalExpenses} net={net} currency={currency} />
    </Card>
  )
}

/* ── Remaining to Pay — the action list (planned but not yet fully paid) ───── */

function RemainingToPay({ items, currency, className }) {
  const pending = items
    .filter(i => i.type === 'expense' && Number(i.planned) - Number(i.actual) > 0)
    .map(i => ({ ...i, remaining: Number(i.planned) - Number(i.actual) }))
    .sort((a, b) => b.remaining - a.remaining)
  const total = pending.reduce((s, i) => s + i.remaining, 0)
  const caughtUp = pending.length === 0

  return (
    <Card className={className}>
      {/* Amber accent bar draws the eye when something is actually due */}
      {!caughtUp && <div className="h-1 bg-[var(--warning)]" />}
      <div className="px-4 md:px-6 pt-4 pb-3 border-b border-[var(--border)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={15} className={caughtUp ? 'text-[var(--success)]' : 'text-[var(--warning)]'} />
          <h2 className="text-[15px] font-semibold text-[var(--text-1)]">Remaining to Pay</h2>
          {!caughtUp && (
            <span className="text-[11px] font-bold text-[var(--warning)] bg-[var(--warning-bg)] border border-[var(--warning-border)] px-1.5 py-0.5 rounded-full leading-none">
              {pending.length}
            </span>
          )}
        </div>
        {!caughtUp && <span className="text-[15px] font-bold text-[var(--warning)] shrink-0">{formatCurrency(total, currency)}</span>}
      </div>

      {caughtUp ? (
        <div className="px-4 md:px-6 py-6 flex flex-col items-center text-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[var(--success-bg)] flex items-center justify-center text-[var(--success)]">
            <Check size={17} />
          </div>
          <p className="text-sm font-medium text-[var(--text-1)]">All caught up</p>
          <p className="text-xs text-[var(--text-3)]">Every planned expense is fully paid.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {pending.map(item => (
            <div key={item.id} className="px-4 md:px-6 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <CategoryIcon name={item.category} type={item.type} />
                <span className="text-sm text-[var(--text-1)] truncate">{item.category}</span>
              </div>
              <span className="text-sm font-semibold text-[var(--text-1)] shrink-0">{formatCurrency(item.remaining, currency)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ── Budget Summary Panel ─────────────────────────────────────────────────── */

function BudgetSummaryPanel({ items, currency, totalPlannedExp, totalExpenses }) {
  const spentPct = totalPlannedExp > 0 ? Math.min(999, Math.round((totalExpenses / totalPlannedExp) * 100)) : 0

  const overBudget = items.filter(
    i => i.type === 'expense' && Number(i.actual) > Number(i.planned) && Number(i.planned) > 0
  )

  return (
    <div className="space-y-6">

      {/* Remaining to pay — surfaced first; it's the action list you shouldn't miss */}
      <RemainingToPay items={items} currency={currency} className="hidden md:block" />

      {/* Utilization */}
      <Card>
        <div className="px-4 md:px-6 pt-4 pb-3 border-b border-[var(--border)]">
          <h2 className="text-[15px] font-semibold text-[var(--text-1)]">Budget Utilization</h2>
        </div>
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-end justify-between mb-3">
            <p className="text-[34px] font-bold text-[var(--text-1)] leading-none tracking-tight">{spentPct}%</p>
            <p className="text-xs text-[var(--text-3)] mb-1">of expenses budget</p>
          </div>
          <ProgressBar value={totalExpenses} max={totalPlannedExp} className="h-2" />
          <div className="flex justify-between mt-2.5 text-[11px] text-[var(--text-3)]">
            <span>{formatCurrency(totalExpenses, currency)} spent</span>
            <span>{formatCurrency(totalPlannedExp, currency)} planned</span>
          </div>
        </div>
      </Card>

      {/* Over budget items */}
      {overBudget.length > 0 && (
        <Card>
          <div className="px-4 md:px-6 pt-4 pb-3 border-b border-[var(--border)] flex items-center gap-2">
            <AlertTriangle size={15} className="text-[var(--danger)]" />
            <h2 className="text-[15px] font-semibold text-[var(--text-1)]">Over Budget</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {overBudget.map(item => {
              const over = Number(item.actual) - Number(item.planned)
              return (
                <div key={item.id} className="px-4 md:px-6 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-sm text-[var(--text-1)] truncate flex-1">{item.category}</span>
                  <span className="text-sm font-semibold text-[var(--danger)] shrink-0">+{formatCurrency(over, currency)}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

    </div>
  )
}
