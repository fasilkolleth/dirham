import { useState } from 'react'
import { Pencil, Trash2, CreditCard, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/shared/EmptyState'
import { FAB } from '@/components/shared/FAB'
import { useEMI } from '@/hooks/useEMI'
import { useApp } from '@/context/AppContext'
import { formatCurrency } from '@/utils/currencyFormatter'
import { normCurrency, CURRENCIES } from '@/utils/currencies'
import { formatDate, toDateInput } from '@/utils/dateHelpers'
import toast from 'react-hot-toast'
import { ProgressBar } from '@/components/ui/ProgressBar'

const BLANK = { purpose: '', lender: '', startDate: '', endDate: '', monthlyAmount: '', totalAmount: '', notes: '', currency: '' }

export default function EMIPage() {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [deleteId, setDeleteId] = useState(null)
  const [saving, setSaving] = useState(false)

  const { emis: allEmis, isLoading, addMutation, updateMutation, deleteMutation } = useEMI()
  const { activeCurrency } = useApp()
  const emis = allEmis.filter(e => normCurrency(e.currency) === activeCurrency)
  const totalMonthlyEMI = emis.filter(e => e.status !== 'closed').reduce((s, e) => s + (e.monthlyAmount || 0), 0)

  const openAdd = () => { setForm({ ...BLANK, currency: activeCurrency }); setEditId(null); setShowForm(true) }
  const openEdit = (emi) => {
    setForm({ purpose: emi.purpose || '', lender: emi.lender || '', startDate: toDateInput(emi.startDate), endDate: toDateInput(emi.endDate), monthlyAmount: String(emi.monthlyAmount || ''), totalAmount: String(emi.totalAmount || ''), notes: emi.notes || '', currency: normCurrency(emi.currency) })
    setEditId(emi.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.purpose.trim() || !form.lender.trim()) return toast.error('Purpose and lender are required')
    setSaving(true)
    try {
      const data = {
        ...form,
        monthlyAmount: Number(form.monthlyAmount) || 0,
        totalAmount: Number(form.totalAmount) || 0,
        currency: normCurrency(form.currency || activeCurrency),
      }
      if (editId) await updateMutation.mutateAsync({ id: editId, data })
      else await addMutation.mutateAsync(data)
      setShowForm(false)
      toast.success(editId ? 'EMI updated' : 'EMI added')
    } catch (err) { console.error(err); toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteId)
      setDeleteId(null)
      toast.success('EMI removed')
    } catch (err) { console.error(err); toast.error('Failed to delete') }
  }

  // Soonest to finish first, so the most urgent EMIs sit at the top.
  const byEndDateAsc = (a, b) => (a.daysRemaining ?? Infinity) - (b.daysRemaining ?? Infinity)
  const active = emis.filter(e => e.status !== 'closed').sort(byEndDateAsc)
  const closed = emis.filter(e => e.status === 'closed')

  return (
    <>
      <div className="px-4 md:px-8 pt-4 md:pt-6 pb-28 md:pb-6 space-y-5 animate-fade-in">

        {/* Summary banner */}
        {active.length > 0 && (
          <Card
            className="overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0062FF 0%, #7C3AED 100%)', border: 'none', boxShadow: '0 8px 32px rgba(0, 98, 255, 0.25)' }}
          >
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>Monthly EMI Outflow</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(totalMonthlyEMI, activeCurrency)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>Active</p>
                <p className="text-2xl font-bold text-white">{active.length}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && emis.length === 0 && (
          <EmptyState
            icon={<CreditCard size={26} />}
            title="No EMIs tracked"
            description="Add your loan, mortgage, or installment payments"
            action={<Button onClick={openAdd}>Add EMI</Button>}
          />
        )}

        {active.length > 0 && (
          <EMISection title="Active" showTitle={closed.length > 0} emis={active} onEdit={openEdit} onDelete={setDeleteId} currency={activeCurrency} />
        )}

        {closed.length > 0 && (
          <EMISection title="Closed" showTitle={active.length > 0} emis={closed} onEdit={openEdit} onDelete={setDeleteId} currency={activeCurrency} />
        )}
      </div>

      <FAB onClick={openAdd} label="Add EMI" />

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit EMI' : 'Add EMI'}>
        <div className="space-y-4">
          <Input label="Purpose" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Car Loan, Home Mortgage" />
          <Input label="Lender / Bank" value={form.lender} onChange={e => setForm(f => ({ ...f, lender: e.target.value }))} placeholder="e.g. ADCB, Emirates NBD" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            <Input label="End Date" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={`Monthly Amount (${form.currency || activeCurrency})`} type="number" value={form.monthlyAmount} onChange={e => setForm(f => ({ ...f, monthlyAmount: e.target.value }))} placeholder="0" />
            <Input label={`Total Amount (${form.currency || activeCurrency})`} type="number" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} placeholder="0" />
          </div>
          <Select label="Currency" value={form.currency || activeCurrency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </Select>
          <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete EMI?"
        description="This will permanently remove this EMI record."
        loading={deleteMutation.isPending}
      />
    </>
  )
}

// Status → visual treatment.
//  • active      → orange bar (actively paying it down)
//  • ending_soon → green bar  (the "good color": almost paid off)
//  • closed      → full green bar + green card (paid off, archived below)
const EMI_STATUS = {
  active:      { tone: 'warning', card: '' },
  ending_soon: { tone: 'success', card: 'ring-1 ring-[var(--success-border)]' },
  closed:      { tone: 'success', card: 'bg-[var(--success-bg)] border border-[var(--success-border)]' },
}

// One section (Active / Closed) — table on desktop, cards on mobile.
function EMISection({ title, showTitle = true, emis, onEdit, onDelete, currency }) {
  return (
    <div>
      {showTitle && <p className="section-label mb-2 px-1">{title}</p>}

      {/* Mobile: cards */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {emis.map(emi => <EMICard key={emi.id} emi={emi} onEdit={onEdit} onDelete={onDelete} currency={currency} />)}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xs)]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[var(--surface-2)] text-left">
              <Th className="pl-4">Loan</Th>
              <Th>Bank</Th>
              <Th className="text-right">Monthly</Th>
              <Th className="text-right">Remaining</Th>
              <Th className="text-right">Balance</Th>
              <Th className="w-[22%]">Progress</Th>
              <Th>Term</Th>
              <Th>Status</Th>
              <Th className="pr-4 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {emis.map(emi => <EMIRow key={emi.id} emi={emi} onEdit={onEdit} onDelete={onDelete} currency={currency} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, className }) {
  return (
    <th className={cn('px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-[var(--text-3)] whitespace-nowrap', className)}>
      {children}
    </th>
  )
}

function EMIRow({ emi, onEdit, onDelete, currency }) {
  const isClosed = emi.status === 'closed'
  const isEndingSoon = emi.status === 'ending_soon'
  const style = EMI_STATUS[emi.status] || EMI_STATUS.active

  return (
    <tr className={cn(
      'group border-t border-[var(--border)] transition-colors',
      isClosed ? 'bg-[var(--success-bg)] hover:bg-[var(--success-bg)]' : 'hover:bg-[var(--surface-2)]'
    )}>
      {/* Loan: purpose */}
      <td className="pl-4 pr-3 py-3 align-middle">
        <div className="flex items-center gap-2 min-w-0">
          {isClosed && <CheckCircle2 size={16} className="text-[var(--success)] shrink-0" />}
          <p className="font-medium text-[var(--text-1)] truncate min-w-0">{emi.purpose}</p>
        </div>
      </td>

      {/* Bank / lender */}
      <td className="px-3 py-3 align-middle text-[var(--text-2)] truncate max-w-[160px]">
        {emi.lender || '—'}
      </td>

      {/* Monthly */}
      <td className="px-3 py-3 text-right tabular-nums font-medium text-[var(--text-1)] whitespace-nowrap">
        {formatCurrency(emi.monthlyAmount, currency)}
      </td>

      {/* Remaining months */}
      <td className={cn(
        'px-3 py-3 text-right tabular-nums whitespace-nowrap',
        isEndingSoon ? 'text-[var(--success)] font-medium' : 'text-[var(--text-2)]'
      )}>
        <span className="inline-flex items-center gap-1 justify-end">
          {isEndingSoon && <Clock size={12} className="shrink-0" />}
          {isClosed ? '—' : `${emi.monthsRemaining}m`}
        </span>
      </td>

      {/* Balance */}
      <td className="px-3 py-3 text-right tabular-nums font-medium text-[var(--text-1)] whitespace-nowrap">
        {formatCurrency(emi.amountRemaining, currency)}
      </td>

      {/* Progress */}
      <td className="px-3 py-3 align-middle">
        {emi.totalAmount > 0 ? (
          <div className="min-w-[120px]">
            <div className="flex justify-between text-xs text-[var(--text-3)] mb-1 tabular-nums">
              <span>{formatCurrency(emi.totalPaid, currency)}</span>
              <span>{formatCurrency(emi.totalAmount, currency)}</span>
            </div>
            <ProgressBar value={emi.totalPaid} max={emi.totalAmount} tone={style.tone} />
          </div>
        ) : <span className="text-xs text-[var(--text-3)]">—</span>}
      </td>

      {/* Term — end date emphasised (that's what the list is sorted by) */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className={cn('text-sm font-semibold', isEndingSoon ? 'text-[var(--success)]' : 'text-[var(--text-1)]')}>
          {formatDate(emi.endDate)}
        </div>
        <div className="text-xs text-[var(--text-3)]">from {formatDate(emi.startDate)}</div>
      </td>

      {/* Status */}
      <td className="px-3 py-3 whitespace-nowrap">
        {isClosed ? <Badge variant="success">Paid Off</Badge> : <StatusBadge status={emi.status} />}
      </td>

      {/* Actions */}
      <td className="pr-4 pl-3 py-3 whitespace-nowrap">
        <div className="flex items-center justify-end gap-2.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(emi)} className="text-[var(--text-3)] hover:text-[var(--accent-text)] transition-colors"><Pencil size={14} /></button>
          <button onClick={() => onDelete(emi.id)} className="text-[var(--text-3)] hover:text-[var(--danger)] transition-colors"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  )
}

function EMICard({ emi, onEdit, onDelete, currency }) {
  const isClosed = emi.status === 'closed'
  const isEndingSoon = emi.status === 'ending_soon'
  const style = EMI_STATUS[emi.status] || EMI_STATUS.active

  return (
    <Card className={style.card}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isClosed && <CheckCircle2 size={18} className="text-[var(--success)] shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-1)] truncate">{emi.purpose}</p>
              <p className="text-xs text-[var(--text-2)] truncate">{emi.lender}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 ml-2">
            {isClosed
              ? <Badge variant="success">Paid Off</Badge>
              : <StatusBadge status={emi.status} />}
            <button onClick={() => onEdit(emi)} className="text-[var(--text-3)] hover:text-[var(--accent-text)] transition-colors"><Pencil size={14} /></button>
            <button onClick={() => onDelete(emi.id)} className="text-[var(--text-3)] hover:text-[var(--danger)] transition-colors"><Trash2 size={14} /></button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <p className="text-xs text-[var(--text-3)]">Monthly</p>
            <p className="text-sm font-semibold text-[var(--text-1)]">{formatCurrency(emi.monthlyAmount, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-3)]">Remaining</p>
            <p className={cn(
              'text-sm font-semibold inline-flex items-center gap-1',
              isEndingSoon ? 'text-[var(--success)]' : 'text-[var(--text-1)]'
            )}>
              {isEndingSoon && <Clock size={12} className="shrink-0" />}
              {isClosed ? '—' : `${emi.monthsRemaining}m`}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-3)]">Balance</p>
            <p className="text-sm font-semibold text-[var(--text-1)]">{formatCurrency(emi.amountRemaining, currency)}</p>
          </div>
        </div>

        {emi.totalAmount > 0 && (
          <div>
            <div className="flex justify-between text-xs text-[var(--text-3)] mb-1.5">
              <span>Paid: {formatCurrency(emi.totalPaid, currency)}</span>
              <span>Total: {formatCurrency(emi.totalAmount, currency)}</span>
            </div>
            <ProgressBar value={emi.totalPaid} max={emi.totalAmount} tone={style.tone} />
          </div>
        )}

        <div className="flex items-center gap-2 mt-2 text-xs">
          <span className="text-[var(--text-3)]">From {formatDate(emi.startDate)}</span>
          <span className="text-[var(--text-3)]">·</span>
          <span className={cn('font-semibold', isEndingSoon ? 'text-[var(--success)]' : 'text-[var(--text-1)]')}>Ends {formatDate(emi.endDate)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
