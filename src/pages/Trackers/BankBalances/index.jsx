import { useState } from 'react'
import { Pencil, Trash2, Wallet, PiggyBank, Plus, X, ArrowLeftRight, Receipt, Users, Coins, CalendarClock, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { FAB } from '@/components/shared/FAB'
import { useBankAccounts, useBalanceHistory } from '@/hooks/useBankAccounts'
import { useTransfers } from '@/hooks/useTransfers'
import { useApp } from '@/context/AppContext'
import { BankLogo } from '@/components/shared/BankLogo'
import { formatCurrency } from '@/utils/currencyFormatter'
import { normCurrency, CURRENCIES } from '@/utils/currencies'
import { formatDate, toDateInput } from '@/utils/dateHelpers'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

const BLANK = { bankName: '', accountType: 'savings', balance: '' }
const ACCOUNT_TYPES = ['savings', 'current', 'investment', 'salary', 'joint', 'other']

const newId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`

const sumAllocations = (allocations = []) =>
  allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0)

export default function BankBalancesPage() {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [deleteId, setDeleteId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [allocAccount, setAllocAccount] = useState(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [deleteTransferRec, setDeleteTransferRec] = useState(null)

  const { accounts: allAccounts, isLoading, addMutation, updateMutation, deleteMutation } = useBankAccounts()
  const { transfers: allTransfers, addMutation: addTransferMutation, deleteMutation: deleteTransferMutation } = useTransfers()
  const { activeCurrency } = useApp()

  // Scope everything on this page to the active currency world.
  const accounts = allAccounts.filter(a => normCurrency(a.currency) === activeCurrency)
  const totalBalance = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)
  const accountIds = new Set(accounts.map(a => a.id))
  const transfers = allTransfers.filter(t => accountIds.has(t.fromAccountId) || accountIds.has(t.toAccountId))

  const openAdd = () => { setForm({ ...BLANK, currency: activeCurrency }); setEditId(null); setShowForm(true) }
  const openEdit = (acc) => {
    setForm({ bankName: acc.bankName || '', accountType: acc.accountType || 'savings', balance: String(acc.balance || ''), currency: normCurrency(acc.currency) })
    setEditId(acc.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.bankName.trim()) return toast.error('Enter a bank name')
    setSaving(true)
    try {
      const data = { ...form, balance: Number(form.balance) || 0, currency: normCurrency(form.currency || activeCurrency) }
      if (editId) await updateMutation.mutateAsync({ id: editId, data, logHistory: true })
      else await addMutation.mutateAsync(data)
      setShowForm(false)
      toast.success(editId ? 'Updated' : 'Account added')
    } catch (err) { console.error(err); toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteId)
      setDeleteId(null)
      toast.success('Account removed')
    } catch (err) { console.error(err); toast.error('Failed to delete') }
  }

  const handleDeleteTransfer = async () => {
    try {
      await deleteTransferMutation.mutateAsync(deleteTransferRec)
      setDeleteTransferRec(null)
      toast.success('Transfer reversed')
    } catch (err) { console.error(err); toast.error('Failed to reverse') }
  }

  return (
    <>
      <div className="px-4 md:px-8 pt-4 md:pt-6 pb-28 md:pb-6 space-y-4 animate-fade-in">

        {/* Total balance hero */}
        {accounts.length > 0 && (
          <Card
            className="overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0062FF 0%, #0EA5E9 100%)', border: 'none', boxShadow: '0 8px 32px rgba(0, 98, 255, 0.25)' }}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.70)' }}>Total Balance</p>
                  <p className="text-3xl font-bold text-white">{formatCurrency(totalBalance, activeCurrency)}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.60)' }}>
                    Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {accounts.length >= 2 && (
                  <button
                    onClick={() => setShowTransfer(true)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-md)] text-sm font-semibold text-white bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                  >
                    <ArrowLeftRight size={15} /> Transfer
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && accounts.length === 0 && (
          <EmptyState
            icon={<Wallet size={26} />}
            title="No accounts yet"
            description="Add your bank accounts to track balances"
            action={<Button onClick={openAdd}>Add Account</Button>}
          />
        )}

        {accounts.map(acc => (
          <AccountCard
            key={acc.id}
            acc={acc}
            onAllocate={() => setAllocAccount(acc)}
            onEdit={() => openEdit(acc)}
            onDelete={() => setDeleteId(acc.id)}
          />
        ))}

        {transfers.length > 0 && (
          <div>
            <p className="section-label mb-2 px-1">Recent Transfers</p>
            <Card>
              <CardContent className="py-1 divide-y divide-[var(--border)]">
                {transfers.slice(0, 8).map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2 py-2.5 group">
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--text-1)] truncate">
                        <span className="font-medium">{t.fromName || 'Account'}</span>
                        <ArrowLeftRight size={11} className="inline mx-1.5 text-[var(--text-3)]" />
                        <span className="font-medium">{t.toName || 'Account'}</span>
                      </p>
                      <p className="text-xs text-[var(--text-3)] truncate">{formatDate(t.date)}{t.note ? ` · ${t.note}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-[var(--text-1)] tabular-nums">{formatCurrency(t.amount, activeCurrency)}</span>
                      <button
                        onClick={() => setDeleteTransferRec(t)}
                        title="Reverse this transfer"
                        className="text-[var(--text-3)] hover:text-[var(--danger)] transition-all md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <FAB onClick={openAdd} label="Add account" />

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Account' : 'Add Account'}>
        <div className="space-y-4">
          <Input label="Bank Name" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="e.g. Emirates NBD, ADCB" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Account Type" value={form.accountType} onChange={e => setForm(f => ({ ...f, accountType: e.target.value }))}>
              {ACCOUNT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </Select>
            <Select label="Currency" value={form.currency || activeCurrency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </Select>
          </div>
          <Input label={`Current Balance (${form.currency || activeCurrency})`} type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} placeholder="0" />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <AllocationsModal
        account={allocAccount}
        onClose={() => setAllocAccount(null)}
        updateMutation={updateMutation}
      />

      {showTransfer && (
        <TransferModal
          accounts={accounts}
          onClose={() => setShowTransfer(false)}
          addMutation={addTransferMutation}
        />
      )}

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remove Account?" description="This will delete the account and its history." loading={deleteMutation.isPending} />

      <ConfirmModal
        open={!!deleteTransferRec}
        onClose={() => setDeleteTransferRec(null)}
        onConfirm={handleDeleteTransfer}
        title="Reverse this transfer?"
        description={deleteTransferRec ? `${formatCurrency(deleteTransferRec.amount, activeCurrency)} will move back from ${deleteTransferRec.toName || 'the destination'} to ${deleteTransferRec.fromName || 'the source'}.` : ''}
        loading={deleteTransferMutation.isPending}
      />
    </>
  )
}

// One account: minimal by default (logo, balance, a "Details" toggle). Expanding
// reveals allocations + recent activity, so cards stay short until you want more.
function AccountCard({ acc, onAllocate, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const cur = normCurrency(acc.currency)
  const allocations = acc.allocations || []
  const allocated = sumAllocations(allocations)
  const free = (Number(acc.balance) || 0) - allocated
  const overAllocated = free < 0

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <BankLogo name={acc.bankName} size={44} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-1)] truncate">{acc.bankName}</p>
              <p className="text-xs text-[var(--text-2)] capitalize">{acc.accountType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button onClick={onAllocate} title="Allocate balance" className={cn('transition-colors', allocations.length ? 'text-[var(--accent-text)]' : 'text-[var(--text-3)] hover:text-[var(--accent-text)]')}><PiggyBank size={15} /></button>
            <button onClick={onEdit} title="Edit account" className="text-[var(--text-3)] hover:text-[var(--accent-text)] transition-colors"><Pencil size={15} /></button>
            <button onClick={onDelete} title="Remove account" className="text-[var(--text-3)] hover:text-[var(--danger)] transition-colors"><Trash2 size={15} /></button>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-3)]">Balance</p>
          <p className="text-[1.7rem] leading-tight font-bold text-[var(--text-1)] tracking-tight mt-1">{formatCurrency(acc.balance, cur)}</p>
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-xs font-medium text-[var(--accent-text)] hover:opacity-80 transition-opacity">
            {expanded ? <>Hide details <ChevronUp size={13} /></> : <>Details <ChevronDown size={13} /></>}
          </button>
          {!expanded && allocations.length > 0 && (
            <span className="text-xs text-[var(--text-2)]">
              <span className={cn('font-semibold', overAllocated ? 'text-[var(--danger)]' : 'text-[var(--success)]')}>{formatCurrency(free, cur)}</span> free
            </span>
          )}
        </div>

        {expanded && (
          <div className="mt-4">
            {allocations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="section-label">Allocated</p>
                  <p className="text-xs text-[var(--text-2)]">{formatCurrency(allocated, cur)} of {formatCurrency(acc.balance, cur)}</p>
                </div>
                <ProgressBar value={allocated} max={Number(acc.balance) || 0} kind="expense" />
                <div className="space-y-1.5 pt-0.5">
                  {allocations.map(a => (
                    <div key={a.id} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-2)] truncate pr-2">{a.label || 'Untitled'}</span>
                      <span className="text-[var(--text-1)] font-medium shrink-0">{formatCurrency(Number(a.amount) || 0, cur)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[var(--border)]">
                  <span className={cn('font-medium', overAllocated ? 'text-[var(--danger)]' : 'text-[var(--text-2)]')}>{overAllocated ? 'Over-allocated' : 'Free to use'}</span>
                  <span className={cn('font-semibold', overAllocated ? 'text-[var(--danger)]' : 'text-[var(--success)]')}>{formatCurrency(free, cur)}</span>
                </div>
              </div>
            )}
            <div className={cn(allocations.length > 0 && 'mt-4 pt-4 border-t border-[var(--border)]')}>
              <AccountActivity accountId={acc.id} currency={cur} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TransferModal({ accounts, onClose, addMutation }) {
  const { activeCurrency } = useApp()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(toDateInput(new Date()))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const fromAcc = accounts.find(a => a.id === from)
  const toAcc = accounts.find(a => a.id === to)
  const amt = Number(amount) || 0
  const insufficient = fromAcc && amt > (Number(fromAcc.balance) || 0)

  const submit = async () => {
    if (!from || !to) return toast.error('Pick both accounts')
    if (from === to) return toast.error('Choose two different accounts')
    if (amt <= 0) return toast.error('Enter an amount')
    setSaving(true)
    try {
      await addMutation.mutateAsync({
        fromAccountId: from, toAccountId: to,
        fromName: fromAcc?.bankName || '', toName: toAcc?.bankName || '',
        amount: amt, date, note: note.trim(),
      })
      toast.success('Transfer recorded')
      onClose()
    } catch (err) { console.error(err); toast.error('Transfer failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Transfer money">
      <div className="space-y-4">
        <Select label="From account" value={from} onChange={e => { const v = e.target.value; setFrom(v); if (v === to) setTo('') }}>
          <option value="">Select account</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} · {formatCurrency(a.balance, activeCurrency)}</option>)}
        </Select>
        <Select label="To account" value={to} onChange={e => setTo(e.target.value)}>
          <option value="">Select account</option>
          {accounts.filter(a => a.id !== from).map(a => <option key={a.id} value={a.id}>{a.bankName}</option>)}
        </Select>
        <Input label={`Amount (${activeCurrency})`} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
        {insufficient && (
          <p className="text-xs text-[var(--warning)] -mt-2">
            More than {fromAcc.bankName}'s balance — it will go negative.
          </p>
        )}
        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Input label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Monthly savings" />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={submit} disabled={saving} className="flex-1">{saving ? 'Transferring…' : 'Transfer'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function AllocationsModal({ account, onClose, updateMutation }) {
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadedFor, setLoadedFor] = useState(null)

  // Re-seed the editor whenever a different account is opened.
  if (account && loadedFor !== account.id) {
    setRows((account.allocations || []).map(a => ({ id: a.id || newId(), label: a.label || '', amount: String(a.amount ?? '') })))
    setLoadedFor(account.id)
  }
  if (!account && loadedFor !== null) setLoadedFor(null)

  if (!account) return null
  const cur = normCurrency(account.currency)

  const balance = Number(account.balance) || 0
  const allocated = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const free = balance - allocated
  const overAllocated = free < 0

  const addRow = () => setRows(r => [...r, { id: newId(), label: '', amount: '' }])
  const removeRow = (id) => setRows(r => r.filter(x => x.id !== id))
  const updateRow = (id, patch) => setRows(r => r.map(x => x.id === id ? { ...x, ...patch } : x))

  const handleSave = async () => {
    const allocations = rows
      .filter(r => r.label.trim() || Number(r.amount) > 0)
      .map(r => ({ id: r.id, label: r.label.trim(), amount: Number(r.amount) || 0 }))
    setSaving(true)
    try {
      await updateMutation.mutateAsync({ id: account.id, data: { allocations } })
      toast.success('Allocations saved')
      onClose()
    } catch (err) { console.error(err); toast.error('Failed to save allocations') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={!!account} onClose={onClose} title={`Allocate — ${account.bankName}`}>
      <div className="space-y-4">
        <p className="text-xs text-[var(--text-2)] leading-relaxed">
          Earmark parts of this {formatCurrency(balance, cur)} balance for specific purposes. Whatever's left is free to spend.
        </p>

        <div className="space-y-2">
          {rows.map(row => (
            <div key={row.id} className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  placeholder="Purpose (e.g. Emergency fund)"
                  value={row.label}
                  onChange={e => updateRow(row.id, { label: e.target.value })}
                />
              </div>
              <div className="w-28 shrink-0">
                <Input
                  type="number"
                  placeholder="0"
                  value={row.amount}
                  onChange={e => updateRow(row.id, { amount: e.target.value })}
                />
              </div>
              <button
                onClick={() => removeRow(row.id)}
                className="h-10 w-9 shrink-0 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-3)] hover:text-[var(--danger)] hover:bg-[var(--surface-2)] transition-all"
                title="Remove"
              >
                <X size={15} />
              </button>
            </div>
          ))}

          <Button variant="ghost" size="sm" onClick={addRow} className="w-full">
            <Plus size={14} /> Add allocation
          </Button>
        </div>

        {/* Live summary */}
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-2)] p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-2)]">Allocated</span>
            <span className="text-[var(--text-1)] font-medium">{formatCurrency(allocated, cur)}</span>
          </div>
          <ProgressBar value={allocated} max={balance} kind="expense" />
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className={cn('font-medium', overAllocated ? 'text-[var(--danger)]' : 'text-[var(--text-2)]')}>
              {overAllocated ? 'Over-allocated by' : 'Free to use'}
            </span>
            <span className={cn('font-semibold', overAllocated ? 'text-[var(--danger)]' : 'text-[var(--success)]')}>
              {formatCurrency(Math.abs(free), cur)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// Icon per posting source so the user can tell at a glance what moved the money.
const ACTIVITY_ICON = {
  transfer: ArrowLeftRight,
  budget: Wallet,
  lending: Users,
  lending_repayment: Users,
  owned_cheque: Receipt,
  rented_cheque: Receipt,
  emi_payment: CalendarClock, // legacy entries
}

// What actually happened to this account: cheque clearings, budget posts,
// lending, transfers and manual edits — newest first.
function AccountActivity({ accountId, currency }) {
  const { data: history = [] } = useBalanceHistory(accountId)
  const [showAll, setShowAll] = useState(false)

  // Normalize both shapes (signed delta + reason, or manual old→new) into one list.
  const txns = history.map(h => {
    const isDelta = typeof h.delta === 'number'
    const delta = isDelta ? h.delta : (Number(h.newBalance) || 0) - (Number(h.oldBalance) || 0)
    const label = isDelta ? (h.reason || 'Adjustment') : 'Manual adjustment'
    const Icon = isDelta ? (ACTIVITY_ICON[h.sourceType] || Coins) : Pencil
    return { id: h.id, date: h.date, delta, label, Icon }
  })

  if (!txns.length) {
    return <p className="text-xs text-[var(--text-3)]">No activity yet.</p>
  }

  const shown = showAll ? txns.slice(0, 25) : txns.slice(0, 5)

  return (
    <div>
      <p className="section-label mb-2.5">Recent Activity</p>
      <div className="space-y-3">
        {shown.map(t => (
          <div key={t.id} className="flex items-center gap-2.5">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
              t.delta >= 0 ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--danger-bg)] text-[var(--danger)]'
            )}>
              <t.Icon size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--text-1)] truncate">{t.label}</p>
              <p className="text-[11px] text-[var(--text-3)]">{formatDate(t.date)}</p>
            </div>
            <span className={cn('text-xs font-semibold tabular-nums shrink-0', t.delta >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
              {t.delta >= 0 ? '+' : '−'}{formatCurrency(Math.abs(t.delta), currency)}
            </span>
          </div>
        ))}
      </div>
      {txns.length > 5 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-3 flex items-center gap-0.5 text-xs font-medium text-[var(--accent-text)] hover:opacity-80 transition-opacity"
        >
          {showAll ? <>Show less <ChevronUp size={12} /></> : <>View all activity <ChevronDown size={12} /></>}
        </button>
      )}
    </div>
  )
}
