import { useState } from 'react'
import { Pencil, Trash2, HandCoins, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { EmptyState } from '@/components/shared/EmptyState'
import { FAB } from '@/components/shared/FAB'
import { useLending, useRepayments } from '@/hooks/useLending'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useApp } from '@/context/AppContext'
import { useCalendarSync } from '@/hooks/useCalendarSync'
import { updateLending } from '@/services/firestore'
import { formatCurrency } from '@/utils/currencyFormatter'
import { normCurrency, CURRENCIES } from '@/utils/currencies'
import { formatDate, toDateInput } from '@/utils/dateHelpers'
import { ProgressBar } from '@/components/ui/ProgressBar'
import toast from 'react-hot-toast'

const BLANK = { borrowerName: '', contact: '', amountLent: '', dateLent: '', reason: '', repaymentPlan: 'lump_sum', agreedDueDate: '', notes: '', accountId: '', currency: '' }
const BLANK_REPAY = { amount: '', date: '', notes: '' }

export default function LendingPage() {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [deleteId, setDeleteId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [repayLendingId, setRepayLendingId] = useState(null)
  const [repayForm, setRepayForm] = useState(BLANK_REPAY)

  const { lendings: allLendings, isLoading, addMutation, updateMutation, deleteMutation } = useLending()
  const { accounts: allAccounts } = useBankAccounts()
  const { activeCurrency } = useApp()
  const calSync = useCalendarSync()
  const lendings = allLendings.filter(l => normCurrency(l.currency) === activeCurrency)
  const accounts = allAccounts.filter(a => normCurrency(a.currency) === activeCurrency)
  const totalLentOut = lendings.filter(l => l.status !== 'settled').reduce((s, l) => s + (l.balanceRemaining || 0), 0)

  const openAdd = () => { setForm({ ...BLANK, currency: activeCurrency }); setEditId(null); setShowForm(true) }
  const openEdit = (l) => {
    setForm({ borrowerName: l.borrowerName || '', contact: l.contact || '', amountLent: String(l.amountLent || ''), dateLent: toDateInput(l.dateLent), reason: l.reason || '', repaymentPlan: l.repaymentPlan || 'lump_sum', agreedDueDate: toDateInput(l.agreedDueDate), notes: l.notes || '', accountId: l.accountId || '', currency: normCurrency(l.currency) })
    setEditId(l.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.borrowerName.trim()) return toast.error('Enter borrower name')
    setSaving(true)
    try {
      const data = { ...form, amountLent: Number(form.amountLent) || 0, currency: normCurrency(form.currency || activeCurrency) }
      let docId = editId
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, data, prev: lendings.find(l => l.id === editId) })
      } else {
        const docRef = await addMutation.mutateAsync(data)
        docId = docRef.id
      }

      const existing = editId ? allLendings.find(l => l.id === editId)?.calendarEventId : null
      const eventId = await calSync.sync({
        type: 'lending',
        title: `Repayment due — ${data.borrowerName}`,
        description: `${formatCurrency(data.amountLent, data.currency)} lent`,
        dueDate: data.agreedDueDate,
        existingEventId: existing,
      })
      if (eventId !== undefined) await updateLending(docId, { calendarEventId: eventId ?? null })

      setShowForm(false)
      toast.success(editId ? 'Updated' : 'Lending added')
    } catch (err) { console.error(err); toast.error('Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      const lending = allLendings.find(l => l.id === deleteId)
      await calSync.remove(lending?.calendarEventId)
      await deleteMutation.mutateAsync(lending || { id: deleteId })
      setDeleteId(null)
      toast.success('Removed')
    } catch (err) { console.error(err); toast.error('Failed') }
  }

  const active = lendings.filter(l => l.status !== 'settled')
  const settled = lendings.filter(l => l.status === 'settled')

  return (
    <>
      <div className="px-4 md:px-8 pt-4 md:pt-6 pb-28 md:pb-6 space-y-5 animate-fade-in">

        {/* Summary banner */}
        {active.length > 0 && (
          <Card
            className="overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #D97706 0%, #EA580C 100%)', border: 'none', boxShadow: '0 8px 32px rgba(217, 119, 6, 0.25)' }}
          >
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>Total Lent Out</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(totalLentOut, activeCurrency)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>Active</p>
                <p className="text-2xl font-bold text-white">{active.length}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && lendings.length === 0 && (
          <EmptyState
            icon={<HandCoins size={26} />}
            title="No loans tracked"
            description="Track money you've lent to others"
            action={<Button onClick={openAdd}>Add Lending</Button>}
          />
        )}

        {active.length > 0 && (
          <div>
            <p className="section-label mb-2 px-1">Active</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {active.map(l => (
                <LendingCard key={l.id} lending={l} onEdit={openEdit} onDelete={setDeleteId} onRepay={() => { setRepayLendingId(l.id); setRepayForm(BLANK_REPAY) }} />
              ))}
            </div>
          </div>
        )}

        {settled.length > 0 && (
          <div>
            <p className="section-label mb-2 px-1">Settled</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {settled.map(l => <LendingCard key={l.id} lending={l} onEdit={openEdit} onDelete={setDeleteId} />)}
            </div>
          </div>
        )}
      </div>

      <FAB onClick={openAdd} label="Add lending" />

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Lending' : 'Add Lending'}>
        <div className="space-y-4">
          <Input label="Borrower Name" value={form.borrowerName} onChange={e => setForm(f => ({ ...f, borrowerName: e.target.value }))} />
          <Input label="Contact (optional)" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={`Amount Lent (${form.currency || activeCurrency})`} type="number" value={form.amountLent} onChange={e => setForm(f => ({ ...f, amountLent: e.target.value }))} />
            <Input label="Date Lent" type="date" value={form.dateLent} onChange={e => setForm(f => ({ ...f, dateLent: e.target.value }))} />
          </div>
          <Select label="Currency" value={form.currency || activeCurrency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </Select>
          {accounts.length > 0 && (
            <Select label="Paid from account (optional)" hint="Only if you actually paid cash out now. Leave blank for money simply owed to you — like a rent share." value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
              <option value="">— No outflow / just owed to me —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName}{a.accountType ? ` · ${a.accountType}` : ''}</option>)}
            </Select>
          )}
          <Input label="Reason" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Repayment Plan" value={form.repaymentPlan} onChange={e => setForm(f => ({ ...f, repaymentPlan: e.target.value }))}>
              <option value="lump_sum">Lump Sum</option>
              <option value="installments">Installments</option>
            </Select>
            <Input label="Due Date" type="date" value={form.agreedDueDate} onChange={e => setForm(f => ({ ...f, agreedDueDate: e.target.value }))} />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      {repayLendingId && (
        <RepayModal
          lendingId={repayLendingId}
          accounts={accounts}
          currency={activeCurrency}
          defaultAccountId={lendings.find(l => l.id === repayLendingId)?.accountId}
          form={repayForm}
          setForm={setRepayForm}
          onClose={() => setRepayLendingId(null)}
        />
      )}

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Lending?" description="This will remove the lending record and all repayments." loading={deleteMutation.isPending} />
    </>
  )
}

function LendingCard({ lending, onEdit, onDelete, onRepay }) {
  const cur = normCurrency(lending.currency)
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-1)]">{lending.borrowerName}</p>
            {lending.reason && <p className="text-xs text-[var(--text-2)]">{lending.reason}</p>}
          </div>
          <div className="flex items-center gap-2.5 shrink-0 ml-2">
            <StatusBadge status={lending.status} />
            <button onClick={() => onEdit(lending)} className="text-[var(--text-3)] hover:text-[var(--accent-text)] transition-colors"><Pencil size={14} /></button>
            <button onClick={() => onDelete(lending.id)} className="text-[var(--text-3)] hover:text-[var(--danger)] transition-colors"><Trash2 size={14} /></button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <p className="text-xs text-[var(--text-3)]">Lent</p>
            <p className="text-sm font-semibold text-[var(--text-1)]">{formatCurrency(lending.amountLent, cur)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-3)]">Repaid</p>
            <p className="text-sm font-semibold text-[var(--success)]">{formatCurrency(lending.totalRepaid || 0, cur)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-3)]">Balance</p>
            <p className="text-sm font-semibold text-[var(--warning)]">{formatCurrency(lending.balanceRemaining, cur)}</p>
          </div>
        </div>

        {lending.amountLent > 0 && <ProgressBar value={lending.totalRepaid || 0} max={lending.amountLent} />}

        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-[var(--text-3)]">
            {lending.agreedDueDate && <span>Due: {formatDate(lending.agreedDueDate)}</span>}
          </div>
          {lending.status !== 'settled' && onRepay && (
            <button
              onClick={onRepay}
              className="text-xs text-[var(--accent-text)] font-medium flex items-center gap-1 hover:text-[var(--accent)] transition-colors"
            >
              <Plus size={12} /> Record repayment
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function RepayModal({ lendingId, accounts = [], currency, defaultAccountId, form, setForm, onClose }) {
  const { addMutation, repayments } = useRepayments(lendingId)
  const [saving, setSaving] = useState(false)
  // Where the money landed — defaults to the loan's funding account, else the
  // only account if there's just one, otherwise the user picks.
  const [toAccountId, setToAccountId] = useState(defaultAccountId || (accounts.length === 1 ? accounts[0].id : ''))

  const handleSave = async () => {
    if (!form.amount) return toast.error('Enter repayment amount')
    setSaving(true)
    try {
      await addMutation.mutateAsync({ amount: Number(form.amount), date: form.date || new Date().toISOString().split('T')[0], notes: form.notes, accountId: toAccountId || '' })
      toast.success('Repayment recorded')
      onClose()
    } catch (err) { console.error(err); toast.error('Failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Record Repayment">
      <div className="space-y-4">
        <Input label={`Amount (${currency})`} type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        {accounts.length > 0 && (
          <Select label="Deposit to account" hint="The money received is added to this account's balance." value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
            <option value="">— Don't add to a bank —</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName}{a.accountType ? ` · ${a.accountType}` : ''}</option>)}
          </Select>
        )}
        <Input label="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

        {repayments?.length > 0 && (
          <div className="border-t border-[var(--border)] pt-3">
            <p className="section-label mb-2">Previous Repayments</p>
            <div className="space-y-1.5">
              {repayments.map(r => (
                <div key={r.id} className="flex justify-between text-xs">
                  <span className="text-[var(--text-3)]">{formatDate(r.date)}</span>
                  <span className="text-[var(--success)] font-medium">{formatCurrency(r.amount, currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>
    </Modal>
  )
}
