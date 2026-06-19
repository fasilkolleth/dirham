import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, FileText, Receipt, ChevronDown, ChevronUp, Home, User, Clock, CalendarDays, Phone, Landmark } from 'lucide-react'
import { DocSlot } from '@/components/shared/DocSlot'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { EmptyState } from '@/components/shared/EmptyState'
import { FAB } from '@/components/shared/FAB'
import { useRentedProperties, useRentedCheques } from '@/hooks/useProperties'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useApp } from '@/context/AppContext'
import { useCalendarSync } from '@/hooks/useCalendarSync'
import { updateRentedProperty, updateRentedCheque } from '@/services/firestore'
import { reconcileChequePosting, reverseChequePosting } from '@/utils/chequePosting'
import { formatCurrency } from '@/utils/currencyFormatter'
import { normCurrency, CURRENCIES } from '@/utils/currencies'
import { formatDate, toDateInput, daysUntil } from '@/utils/dateHelpers'
import { uploadPropertyFile, deleteFileByUrl } from '@/services/storage'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

const BLANK_PROP = { buildingName: '', landlordName: '', landlordContact: '', contractStartDate: '', contractEndDate: '', annualRent: '', numberOfCheques: '', notes: '', currency: '' }
const BLANK_CHEQUE = { chequeNumber: '', amount: '', dueDate: '', bank: '', status: 'pending', notes: '', accountId: '' }

export default function RentedPropertyPage() {
  const [showPropForm, setShowPropForm] = useState(false)
  const [editPropId, setEditPropId] = useState(null)
  const [propForm, setPropForm] = useState(BLANK_PROP)
  const [deletePropId, setDeletePropId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [expandedProp, setExpandedProp] = useState(null)

  const { properties: allProperties, isLoading, addMutation, updateMutation, deleteMutation } = useRentedProperties()
  const { activeCurrency } = useApp()
  const properties = allProperties.filter(p => normCurrency(p.currency) === activeCurrency)

  const openAddProp = () => { setPropForm({ ...BLANK_PROP, currency: activeCurrency }); setEditPropId(null); setShowPropForm(true) }
  const openEditProp = (prop) => {
    setPropForm({
      buildingName: prop.buildingName || '', landlordName: prop.landlordName || '',
      landlordContact: prop.landlordContact || '', contractStartDate: toDateInput(prop.contractStartDate),
      contractEndDate: toDateInput(prop.contractEndDate), annualRent: String(prop.annualRent || ''),
      numberOfCheques: String(prop.numberOfCheques || ''), notes: prop.notes || '', currency: normCurrency(prop.currency),
    })
    setEditPropId(prop.id)
    setShowPropForm(true)
  }

  const calSync = useCalendarSync()

  const handleSaveProp = async () => {
    if (!propForm.buildingName.trim()) return toast.error('Enter building name')
    setSaving(true)
    try {
      const data = { ...propForm, annualRent: Number(propForm.annualRent) || 0, numberOfCheques: Number(propForm.numberOfCheques) || 0, currency: normCurrency(propForm.currency || activeCurrency) }
      let propId = editPropId
      if (editPropId) {
        await updateMutation.mutateAsync({ id: editPropId, data })
      } else {
        const docRef = await addMutation.mutateAsync(data)
        propId = docRef.id
      }

      const existing = editPropId ? properties.find(p => p.id === editPropId)?.calendarEventId : null
      const eventId = await calSync.sync({
        type: 'rentedContract',
        title: `Rental contract expiry — ${data.buildingName}`,
        description: data.landlordName ? `Landlord: ${data.landlordName}` : '',
        dueDate: data.contractEndDate,
        existingEventId: existing,
      })
      if (eventId !== undefined) await updateRentedProperty(propId, { calendarEventId: eventId ?? null })

      setShowPropForm(false)
      toast.success(editPropId ? 'Updated' : 'Property added')
    } catch (err) { console.error(err); toast.error('Failed') }
    finally { setSaving(false) }
  }

  const handleDeleteProp = async () => {
    try {
      const prop = properties.find(p => p.id === deletePropId)
      await calSync.remove(prop?.calendarEventId)
      await deleteMutation.mutateAsync(deletePropId)
      setDeletePropId(null)
      toast.success('Removed')
    } catch (err) { console.error(err); toast.error('Failed') }
  }

  return (
    <>
      <div className="px-4 md:px-8 pt-4 md:pt-6 pb-28 md:pb-6 space-y-4 animate-fade-in">
        {!isLoading && properties.length === 0 && (
          <EmptyState
            icon={<Home size={26} />}
            title="No rented properties"
            description="Add the property you're renting to track contracts and payments"
            action={<Button onClick={openAddProp}>Add Property</Button>}
          />
        )}

        {properties.map(prop => {
          const cur = normCurrency(prop.currency)
          const daysLeft = daysUntil(prop.contractEndDate)
          const daysColor = daysLeft === null ? 'text-[var(--text-1)]'
            : daysLeft > 90 ? 'text-[var(--success)]'
            : daysLeft > 30 ? 'text-[var(--warning)]'
            : 'text-[var(--danger)]'
          return (
            <div
              key={prop.id}
              className="rounded-[var(--radius-xl)] overflow-hidden bg-[var(--surface)] border border-[var(--card-border)] shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-lg)]"
            >
              {/* Property Header */}
              <div className="flex items-center gap-3.5 p-5 border-b border-[var(--border)]">
                <div
                  className="w-11 h-11 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0 shadow-[var(--brand-glow)]"
                  style={{ background: 'var(--brand-gradient)' }}
                >
                  <Home size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-[var(--text-1)] truncate">{prop.buildingName}</h3>
                  {prop.landlordName && (
                    <p className="text-xs text-[var(--text-2)] mt-0.5 flex items-center gap-1.5 truncate">
                      <User size={12} className="shrink-0" /> {prop.landlordName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEditProp(prop)} className="p-2 rounded-[var(--radius-lg)] text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--accent-text)] transition-all"><Pencil size={15} /></button>
                  <button onClick={() => setDeletePropId(prop.id)} className="p-2 rounded-[var(--radius-lg)] text-[var(--text-3)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] transition-all"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {daysLeft !== null && daysLeft <= 60 && daysLeft >= 0 && (
                  <div className={cn(
                    'flex items-start gap-3 px-4 py-3 rounded-[var(--radius-lg)] text-sm font-medium',
                    daysLeft <= 14 ? 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]' : 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning-border)]'
                  )}>
                    <Clock size={15} className="shrink-0 mt-0.5" />
                    <span>Contract expires in <strong>{daysLeft} days</strong> ({formatDate(prop.contractEndDate)}).</span>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { label: 'Annual Rent', value: formatCurrency(prop.annualRent, cur), span: true },
                    { label: 'Cheques', value: prop.numberOfCheques || '—' },
                    { label: 'Days Left', value: daysLeft !== null ? daysLeft : '—', className: daysColor },
                  ].map(item => (
                    <div key={item.label} className={cn('bg-[var(--surface-2)] rounded-[var(--radius-md)] px-3 py-2.5', item.span && 'col-span-2 md:col-span-1')}>
                      <p className="text-xs text-[var(--text-3)] mb-0.5">{item.label}</p>
                      <p className={cn('text-sm font-bold text-[var(--text-1)] whitespace-nowrap', item.className)}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
                  <CalendarDays size={12} className="shrink-0" />
                  <span>{formatDate(prop.contractStartDate)} → {formatDate(prop.contractEndDate)}</span>
                </div>

                {prop.landlordContact && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-2)]">
                    <Phone size={12} className="shrink-0" />
                    <span>{prop.landlordContact}</span>
                  </div>
                )}

                <button
                  onClick={() => setExpandedProp(expandedProp === prop.id ? null : prop.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-1)]">
                    <Receipt size={15} className="text-[var(--accent-text)]" />
                    Cheques & Documents
                  </span>
                  {expandedProp === prop.id ? <ChevronUp size={14} className="text-[var(--text-3)]" /> : <ChevronDown size={14} className="text-[var(--text-3)]" />}
                </button>

                {expandedProp === prop.id && (
                  <div className="space-y-4">
                    <RentedChequeSection propId={prop.id} currency={cur} buildingName={prop.buildingName} />
                    <RentedFileSection prop={prop} updateMutation={updateMutation} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <FAB onClick={openAddProp} label="Add property" />

      <Modal open={showPropForm} onClose={() => setShowPropForm(false)} title={editPropId ? 'Edit Property' : 'Add Rented Property'}>
        <div className="space-y-4">
          <Input label="Building Name" value={propForm.buildingName} onChange={e => setPropForm(f => ({ ...f, buildingName: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Landlord Name" value={propForm.landlordName} onChange={e => setPropForm(f => ({ ...f, landlordName: e.target.value }))} />
            <Input label="Landlord Contact" value={propForm.landlordContact} onChange={e => setPropForm(f => ({ ...f, landlordContact: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contract Start" type="date" value={propForm.contractStartDate} onChange={e => setPropForm(f => ({ ...f, contractStartDate: e.target.value }))} />
            <Input label="Contract End" type="date" value={propForm.contractEndDate} onChange={e => setPropForm(f => ({ ...f, contractEndDate: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={`Annual Rent (${propForm.currency || activeCurrency})`} type="number" value={propForm.annualRent} onChange={e => setPropForm(f => ({ ...f, annualRent: e.target.value }))} />
            <Input label="# Cheques" type="number" value={propForm.numberOfCheques} onChange={e => setPropForm(f => ({ ...f, numberOfCheques: e.target.value }))} />
          </div>
          <Select label="Currency" value={propForm.currency || activeCurrency} onChange={e => setPropForm(f => ({ ...f, currency: e.target.value }))}>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </Select>
          <Textarea label="Notes" value={propForm.notes} onChange={e => setPropForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowPropForm(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSaveProp} disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deletePropId} onClose={() => setDeletePropId(null)} onConfirm={handleDeleteProp} title="Delete Property?" loading={deleteMutation.isPending} />
    </>
  )
}

function RentedChequeSection({ propId, currency, buildingName }) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(BLANK_CHEQUE)
  const { cheques, addMutation, updateMutation, deleteMutation } = useRentedCheques(propId)
  const { accounts: allAccounts } = useBankAccounts()
  const calSync = useCalendarSync()
  const accounts = allAccounts.filter(a => normCurrency(a.currency) === currency)
  const qc = useQueryClient()
  const refreshBank = () => qc.invalidateQueries({ queryKey: ['bank_accounts'] })

  const openAdd = () => { setForm({ ...BLANK_CHEQUE, accountId: accounts.length === 1 ? accounts[0].id : '' }); setEditId(null); setShowForm(true) }
  const openEdit = (c) => {
    setForm({ chequeNumber: c.chequeNumber || '', amount: String(c.amount), dueDate: toDateInput(c.dueDate), bank: c.bank || '', status: c.status || 'pending', notes: c.notes || '', accountId: c.accountId || '' })
    setEditId(c.id); setShowForm(true)
  }

  const handleSave = async () => {
    const next = { ...form, amount: Number(form.amount) || 0 }
    const label = `Rent cheque #${next.chequeNumber || ''}`.trim()
    try {
      let chequeId = editId
      if (editId) {
        const prev = cheques.find(c => c.id === editId)
        const posted = await reconcileChequePosting({ prev, next, incoming: false, sourceId: editId, label })
        await updateMutation.mutateAsync({ id: editId, data: { ...next, ...posted } })
      } else {
        const docRef = await addMutation.mutateAsync({ ...next, postedAmount: 0, postedAccountId: '' })
        chequeId = docRef.id
        const posted = await reconcileChequePosting({ prev: null, next, incoming: false, sourceId: docRef.id, label })
        if (posted.postedAmount) await updateMutation.mutateAsync({ id: docRef.id, data: posted })
      }

      const isFinished = next.status === 'cleared' || next.status === 'bounced'
      const existing = editId ? cheques.find(c => c.id === editId)?.calendarEventId : null
      if (isFinished) {
        await calSync.remove(existing)
        await updateRentedCheque(propId, chequeId, { calendarEventId: null })
      } else {
        const eventId = await calSync.sync({
          type: 'cheque',
          title: `Rent cheque due — ${buildingName} #${next.chequeNumber}`,
          description: formatCurrency(next.amount, currency),
          dueDate: next.dueDate,
          existingEventId: existing,
        })
        if (eventId !== undefined) await updateRentedCheque(propId, chequeId, { calendarEventId: eventId ?? null })
      }

      refreshBank()
      setShowForm(false); setEditId(null); toast.success('Saved')
    } catch (err) { console.error(err); toast.error('Failed to save') }
  }

  const handleDelete = async (c) => {
    try {
      await calSync.remove(c.calendarEventId)
      await reverseChequePosting({ cheque: c, incoming: false, sourceId: c.id, label: `Rent cheque #${c.chequeNumber || ''}`.trim() })
      await deleteMutation.mutateAsync(c.id)
      refreshBank()
    } catch (err) { console.error(err); toast.error('Failed to delete') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="section-label">Cheques ({cheques.length})</p>
        <button
          onClick={openAdd}
          className="text-[var(--accent-text)] text-xs flex items-center gap-1 font-medium"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {cheques.map(c => (
          <div key={c.id} className="bg-[var(--surface-2)] rounded-[var(--radius-lg)] px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-1)] truncate">#{c.chequeNumber}</p>
                {c.accountId && <Landmark size={11} className="text-[var(--accent-text)] shrink-0" title="Pays from a bank account when cleared" />}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusBadge status={c.status} />
                <button onClick={() => openEdit(c)} className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-3)] hover:bg-[var(--surface)] hover:text-[var(--accent-text)] transition-all"><Pencil size={12} /></button>
                <button onClick={() => handleDelete(c)} className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-3)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] transition-all"><Trash2 size={12} /></button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--text-2)]">
              <span className="font-medium text-[var(--text-1)]">{formatCurrency(c.amount, currency)}</span>
              <span className="text-[var(--text-3)]">·</span>
              <span>{formatDate(c.dueDate)}</span>
            </div>
          </div>
        ))}
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Cheque' : 'Add Cheque'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cheque #" value={form.chequeNumber} onChange={e => setForm(f => ({ ...f, chequeNumber: e.target.value }))} />
            <Input label={`Amount (${currency})`} type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Due Date" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            <Input label="Bank" value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} />
          </div>
          <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="pending">Pending</option>
            <option value="cleared">Cleared</option>
            <option value="bounced">Bounced</option>
          </Select>
          {accounts.length > 0 && (
            <Select
              label="Paid from account (when cleared)"
              hint="Once this cheque is marked Cleared, its amount is deducted from this account's balance (and reversed if you un-clear or delete it). Leave blank to skip."
              value={form.accountId || ''}
              onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
            >
              <option value="">— Don't touch any balance —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName}{a.accountType ? ` · ${a.accountType}` : ''}</option>)}
            </Select>
          )}
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </Modal>
    </div>
  )
}

const RENTED_DOCS = [
  { key: 'contract', label: 'Contract', subFolder: 'contracts', field: 'contractUrl', icon: FileText },
  { key: 'cheque', label: 'Cheque', subFolder: 'cheques', field: 'chequeUrl', icon: Receipt },
]

function RentedFileSection({ prop, updateMutation }) {
  const [busy, setBusy] = useState(null)

  const handlePick = async (doc, file) => {
    setBusy(doc.key)
    try {
      const oldUrl = prop[doc.field]
      const { url } = await uploadPropertyFile('rented', prop.id, doc.subFolder, file)
      await updateMutation.mutateAsync({ id: prop.id, data: { [doc.field]: url } })
      if (oldUrl) deleteFileByUrl(oldUrl) // best-effort cleanup of the replaced file
      toast.success('Uploaded')
    } catch (err) { console.error(err); toast.error('Failed') }
    finally { setBusy(null) }
  }

  const handleDelete = async (doc) => {
    setBusy(doc.key)
    try {
      await deleteFileByUrl(prop[doc.field])
      await updateMutation.mutateAsync({ id: prop.id, data: { [doc.field]: '' } })
      toast.success('Removed')
    } catch (err) { console.error(err); toast.error('Failed') }
    finally { setBusy(null) }
  }

  return (
    <div>
      <p className="section-label mb-2">Documents</p>
      <div className="flex flex-col sm:flex-row gap-2">
        {RENTED_DOCS.map(doc => (
          <DocSlot
            key={doc.key}
            url={prop[doc.field]}
            label={doc.label}
            icon={doc.icon}
            busy={busy === doc.key}
            onPick={file => handlePick(doc, file)}
            onDelete={() => handleDelete(doc)}
          />
        ))}
      </div>
    </div>
  )
}
