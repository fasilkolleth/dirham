import { useState } from 'react'
import { Pencil, Trash2, Landmark, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { EmptyState } from '@/components/shared/EmptyState'
import { FAB } from '@/components/shared/FAB'
import { useBorrowing, useBorrowRepayments } from '@/hooks/useBorrowing'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useApp } from '@/context/AppContext'
import { formatCurrency } from '@/utils/currencyFormatter'
import { normCurrency, CURRENCIES } from '@/utils/currencies'
import { formatDate, toDateInput } from '@/utils/dateHelpers'
import { ProgressBar } from '@/components/ui/ProgressBar'
import toast from 'react-hot-toast'

const BLANK = { lenderName: '', contact: '', amountBorrowed: '', dateBorrowed: '', reason: '', repaymentPlan: 'lump_sum', agreedDueDate: '', notes: '', accountId: '', currency: '' }
const BLANK_REPAY = { amount: '', date: '', notes: '' }

export default function BorrowingPage() {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [deleteId, setDeleteId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [repayBorrowingId, setRepayBorrowingId] = useState(null)
  const [repayForm, setRepayForm] = useState(BLANK_REPAY)

  const { borrowings: allBorrowings, isLoading, addMutation, updateMutation, deleteMutation } = useBorrowing()
  const { accounts: allAccounts } = useBankAccounts()
  const { activeCurrency } = useApp()
  const borrowings = allBorrowings.filter(b => normCurrency(b.currency) === activeCurrency)
  const accounts = allAccounts.filter(a => normCurrency(a.currency) === activeCurrency)
  const totalOwed = borrowings.filter(b => b.status !== 'settled').reduce((s, b) => s + (b.balanceRemaining || 0), 0)

  const openAdd = () => { setForm({ ...BLANK, currency: activeCurrency }); setEditId(null); setShowForm(true) }
  const openEdit = (b) => {
    setForm({ lenderName: b.lenderName || '', contact: b.contact || '', amountBorrowed: String(b.amountBorrowed || ''), dateBorrowed: toDateInput(b.dateBorrowed), reason: b.reason || '', repaymentPlan: b.repaymentPlan || 'lump_sum', agreedDueDate: toDateInput(b.agreedDueDate), notes: b.notes || '', accountId: b.accountId || '', currency: normCurrency(b.currency) })
    setEditId(b.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.lenderName.trim()) return toast.error('Enter who you borrowed from')
    setSaving(true)
    try {
      const data = { ...form, amountBorrowed: Number(form.amountBorrowed) || 0, currency: normCurrency(form.currency || activeCurrency) }
      if (editId) await updateMutation.mutateAsync({ id: editId, data, prev: borrowings.find(b => b.id === editId) })
      else await addMutation.mutateAsync(data)
      setShowForm(false)
      toast.success(editId ? 'Updated' : 'Borrowing added')
    } catch (err) { console.error(err); toast.error('Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(borrowings.find(b => b.id === deleteId) || { id: deleteId })
      setDeleteId(null)
      toast.success('Removed')
    } catch (err) { console.error(err); toast.error('Failed') }
  }

  const active = borrowings.filter(b => b.status !== 'settled')
  const settled = borrowings.filter(b => b.status === 'settled')

  return (
    <>
      <div className="px-4 md:px-8 pt-4 md:pt-6 pb-28 md:pb-6 space-y-5 animate-fade-in">

        {/* Summary banner */}
        {active.length > 0 && (
          <Card
            className="overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)', border: 'none', boxShadow: '0 8px 32px rgba(124, 58, 237, 0.25)' }}
          >
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>Total You Owe</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(totalOwed, activeCurrency)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>Active</p>
                <p className="text-2xl font-bold text-white">{active.length}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && borrowings.length === 0 && (
          <EmptyState
            icon={<Landmark size={26} />}
            title="No borrowings tracked"
            description="Track money you've borrowed from others"
            action={<Button onClick={openAdd}>Add Borrowing</Button>}
          />
        )}

        {active.length > 0 && (
          <div>
            <p className="section-label mb-2 px-1">Active</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {active.map(b => (
                <BorrowingCard key={b.id} borrowing={b} onEdit={openEdit} onDelete={setDeleteId} onRepay={() => { setRepayBorrowingId(b.id); setRepayForm(BLANK_REPAY) }} />
              ))}
            </div>
          </div>
        )}

        {settled.length > 0 && (
          <div>
            <p className="section-label mb-2 px-1">Settled</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {settled.map(b => <BorrowingCard key={b.id} borrowing={b} onEdit={openEdit} onDelete={setDeleteId} />)}
            </div>
          </div>
        )}
      </div>

      <FAB onClick={openAdd} label="Add borrowing" />

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Borrowing' : 'Add Borrowing'}>
        <div className="space-y-4">
          <Input label="Borrowed From" value={form.lenderName} onChange={e => setForm(f => ({ ...f, lenderName: e.target.value }))} placeholder="e.g. Ahmed, Bank, Family" />
          <Input label="Contact (optional)" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={`Amount Borrowed (${form.currency || activeCurrency})`} type="number" value={form.amountBorrowed} onChange={e => setForm(f => ({ ...f, amountBorrowed: e.target.value }))} />
            <Input label="Date Borrowed" type="date" value={form.dateBorrowed} onChange={e => setForm(f => ({ ...f, dateBorrowed: e.target.value }))} />
          </div>
          <Select label="Currency" value={form.currency || activeCurrency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </Select>
          <Input label="Reason" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          {accounts.length > 0 && (
            <Select label="Received into account (optional)" hint="The money you borrowed is added to this account's balance. Leave blank if it didn't go into a tracked account." value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
              <option value="">— No deposit / not tracked —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName}{a.accountType ? ` · ${a.accountType}` : ''}</option>)}
            </Select>
          )}
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

      {repayBorrowingId && (
        <RepayModal
          borrowingId={repayBorrowingId}
          accounts={accounts}
          currency={activeCurrency}
          defaultAccountId={borrowings.find(b => b.id === repayBorrowingId)?.accountId || ''}
          form={repayForm}
          setForm={setRepayForm}
          onClose={() => setRepayBorrowingId(null)}
        />
      )}

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Borrowing?" description="This will remove the borrowing record and all repayments." loading={deleteMutation.isPending} />
    </>
  )
}

function BorrowingCard({ borrowing, onEdit, onDelete, onRepay }) {
  const cur = normCurrency(borrowing.currency)
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-1)]">{borrowing.lenderName}</p>
            {borrowing.reason && <p className="text-xs text-[var(--text-2)]">{borrowing.reason}</p>}
          </div>
          <div className="flex items-center gap-2.5 shrink-0 ml-2">
            <StatusBadge status={borrowing.status} />
            <button onClick={() => onEdit(borrowing)} className="text-[var(--text-3)] hover:text-[var(--accent-text)] transition-colors"><Pencil size={14} /></button>
            <button onClick={() => onDelete(borrowing.id)} className="text-[var(--text-3)] hover:text-[var(--danger)] transition-colors"><Trash2 size={14} /></button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <p className="text-xs text-[var(--text-3)]">Borrowed</p>
            <p className="text-sm font-semibold text-[var(--text-1)]">{formatCurrency(borrowing.amountBorrowed, cur)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-3)]">Repaid</p>
            <p className="text-sm font-semibold text-[var(--success)]">{formatCurrency(borrowing.totalRepaid || 0, cur)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-3)]">You Owe</p>
            <p className="text-sm font-semibold text-[var(--warning)]">{formatCurrency(borrowing.balanceRemaining, cur)}</p>
          </div>
        </div>

        {borrowing.amountBorrowed > 0 && <ProgressBar value={borrowing.totalRepaid || 0} max={borrowing.amountBorrowed} />}

        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-[var(--text-3)]">
            {borrowing.agreedDueDate && <span>Due: {formatDate(borrowing.agreedDueDate)}</span>}
          </div>
          {borrowing.status !== 'settled' && onRepay && (
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

function RepayModal({ borrowingId, accounts = [], currency, defaultAccountId, form, setForm, onClose }) {
  const { addMutation, repayments } = useBorrowRepayments(borrowingId)
  const [saving, setSaving] = useState(false)
  const [fromAccountId, setFromAccountId] = useState(defaultAccountId || (accounts.length === 1 ? accounts[0].id : ''))

  const handleSave = async () => {
    if (!form.amount) return toast.error('Enter repayment amount')
    setSaving(true)
    try {
      await addMutation.mutateAsync({ amount: Number(form.amount), date: form.date || new Date().toISOString().split('T')[0], notes: form.notes, accountId: fromAccountId })
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
          <Select label="Paid from account" hint="The repayment is deducted from this account's balance." value={fromAccountId} onChange={e => setFromAccountId(e.target.value)}>
            <option value="">— Don't deduct from any account —</option>
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
