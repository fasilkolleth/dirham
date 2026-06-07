import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { uploadPropertyFile, deleteFileByUrl } from '@/services/storage'
import {
  Plus, Pencil, Trash2, FileText, Receipt, ChevronDown, ChevronUp,
  UserX, Building2, Users, Wrench,
  CalendarDays, Banknote, Phone, Clock, Landmark
} from 'lucide-react'
import { DocSlot } from '@/components/shared/DocSlot'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { EmptyState } from '@/components/shared/EmptyState'
import { FAB } from '@/components/shared/FAB'
import { useOwnedProperties, useOwnedCheques, useMaintenanceFees, useTenantHistory } from '@/hooks/useProperties'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useApp } from '@/context/AppContext'
import { reconcileChequePosting, reverseChequePosting } from '@/utils/chequePosting'
import { formatCurrency } from '@/utils/currencyFormatter'
import { normCurrency, CURRENCIES } from '@/utils/currencies'
import { formatDate, toDateInput, daysUntil } from '@/utils/dateHelpers'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

const BLANK_PROP = { buildingName: '', roomNumber: '', tenantName: '', tenantContact: '', contractStartDate: '', contractEndDate: '', annualRent: '', numberOfCheques: '', loanBank: '', loanEMI: '', loanBalance: '', notes: '', currency: '' }
const BLANK_CHEQUE = { chequeNumber: '', amount: '', dueDate: '', bank: '', status: 'pending', notes: '', accountId: '' }

// Document slots for the current tenant (stored on the property doc) and
// archived tenants (stored on each tenant_history doc). `key` is also the
// storage sub-folder; `urlKey` is the field read for display.
const TENANT_DOCS = [
  { key: 'contract', label: 'Contract', icon: FileText, urlKey: 'contractUrl', field: 'tenantContractUrl' },
  { key: 'cheque', label: 'Cheques', icon: Receipt, urlKey: 'chequeUrl', field: 'tenantChequeUrl' },
]
const HISTORY_DOCS = [
  { key: 'contract', label: 'Contract', icon: FileText, urlKey: 'contractUrl' },
  { key: 'cheque', label: 'Cheques', icon: Receipt, urlKey: 'chequeUrl' },
]

export default function OwnedPropertyPage() {
  const [showPropForm, setShowPropForm] = useState(false)
  const [editPropId, setEditPropId] = useState(null)
  const [propForm, setPropForm] = useState(BLANK_PROP)
  const [deletePropId, setDeletePropId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showLoan, setShowLoan] = useState(false)

  const { properties: allProperties, isLoading, addMutation, updateMutation, deleteMutation } = useOwnedProperties()
  const { activeCurrency } = useApp()
  const properties = allProperties.filter(p => normCurrency(p.currency) === activeCurrency)

  const openAddProp = () => { setPropForm({ ...BLANK_PROP, currency: activeCurrency }); setEditPropId(null); setShowLoan(false); setShowPropForm(true) }
  const openEditProp = (prop) => {
    setPropForm({
      buildingName: prop.buildingName || '', roomNumber: prop.roomNumber || '',
      tenantName: prop.tenantName || '', tenantContact: prop.tenantContact || '',
      contractStartDate: toDateInput(prop.contractStartDate), contractEndDate: toDateInput(prop.contractEndDate),
      annualRent: String(prop.annualRent || ''), numberOfCheques: String(prop.numberOfCheques || ''),
      loanBank: prop.loanBank || '', loanEMI: String(prop.loanEMI || ''),
      loanBalance: String(prop.loanBalance || ''), notes: prop.notes || '', currency: normCurrency(prop.currency),
    })
    setShowLoan(!!(prop.loanBank || Number(prop.loanEMI) || Number(prop.loanBalance)))
    setEditPropId(prop.id); setShowPropForm(true)
  }

  const handleSaveProp = async () => {
    if (!propForm.buildingName.trim()) return toast.error('Enter building name')
    setSaving(true)
    try {
      const data = { ...propForm, annualRent: Number(propForm.annualRent) || 0, numberOfCheques: Number(propForm.numberOfCheques) || 0, loanEMI: Number(propForm.loanEMI) || 0, loanBalance: Number(propForm.loanBalance) || 0, currency: normCurrency(propForm.currency || activeCurrency) }
      if (editPropId) await updateMutation.mutateAsync({ id: editPropId, data })
      else await addMutation.mutateAsync(data)
      setShowPropForm(false)
      toast.success(editPropId ? 'Property updated' : 'Property added')
    } catch (err) { console.error(err); toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="px-4 md:px-8 pt-4 md:pt-6 pb-28 md:pb-6 space-y-5 animate-fade-in">
        {!isLoading && properties.length === 0 && (
          <EmptyState
            icon={<Building2 size={26} />}
            title="No owned properties"
            description="Add your owned properties to track tenants, cheques, and loans"
            action={<Button onClick={openAddProp}>Add Property</Button>}
          />
        )}
        {properties.map(prop => (
          <PropertyCard
            key={prop.id}
            prop={prop}
            onEdit={openEditProp}
            onDelete={() => setDeletePropId(prop.id)}
            updateMutation={updateMutation}
          />
        ))}
      </div>

      <FAB onClick={openAddProp} label="Add property" />

      <Modal open={showPropForm} onClose={() => setShowPropForm(false)} title={editPropId ? 'Edit Property' : 'Add Owned Property'}>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Building Name" value={propForm.buildingName} onChange={e => setPropForm(f => ({ ...f, buildingName: e.target.value }))} />
            <Input label="Room / Unit" value={propForm.roomNumber} onChange={e => setPropForm(f => ({ ...f, roomNumber: e.target.value }))} />
          </div>
          <Select label="Currency" value={propForm.currency || activeCurrency} onChange={e => setPropForm(f => ({ ...f, currency: e.target.value }))}>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </Select>

          {/* Current Tenant */}
          <div>
            <p className="text-[13px] font-semibold text-[var(--text-1)] mb-2.5">Current Tenant</p>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tenant Name" value={propForm.tenantName} onChange={e => setPropForm(f => ({ ...f, tenantName: e.target.value }))} />
                <Input label="Contact" value={propForm.tenantContact} onChange={e => setPropForm(f => ({ ...f, tenantContact: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Contract Start" type="date" value={propForm.contractStartDate} onChange={e => setPropForm(f => ({ ...f, contractStartDate: e.target.value }))} />
                <Input label="Contract End" type="date" value={propForm.contractEndDate} onChange={e => setPropForm(f => ({ ...f, contractEndDate: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label={`Annual Rent (${propForm.currency || activeCurrency})`} type="number" value={propForm.annualRent} onChange={e => setPropForm(f => ({ ...f, annualRent: e.target.value }))} />
                <Input label="# Cheques" type="number" value={propForm.numberOfCheques} onChange={e => setPropForm(f => ({ ...f, numberOfCheques: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Apartment Loan — optional, collapsed until needed */}
          {showLoan ? (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[13px] font-semibold text-[var(--text-1)]">Apartment Loan</p>
                <button
                  type="button"
                  onClick={() => { setShowLoan(false); setPropForm(f => ({ ...f, loanBank: '', loanEMI: '', loanBalance: '' })) }}
                  className="text-xs font-medium text-[var(--text-3)] hover:text-[var(--danger)] transition-colors"
                >
                  Remove
                </button>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="grid grid-cols-3 gap-2">
                  <Input label="Bank" value={propForm.loanBank} onChange={e => setPropForm(f => ({ ...f, loanBank: e.target.value }))} />
                  <Input label="Monthly EMI" type="number" value={propForm.loanEMI} onChange={e => setPropForm(f => ({ ...f, loanEMI: e.target.value }))} />
                  <Input label="Balance" type="number" value={propForm.loanBalance} onChange={e => setPropForm(f => ({ ...f, loanBalance: e.target.value }))} />
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLoan(true)}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] text-sm font-medium text-[var(--accent-text)] hover:bg-[var(--surface-2)] hover:border-[var(--accent)] transition-colors"
            >
              <Plus size={15} /> Add apartment loan
            </button>
          )}

          <Textarea label="Notes" value={propForm.notes} onChange={e => setPropForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setShowPropForm(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSaveProp} disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save Property'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deletePropId} onClose={() => setDeletePropId(null)} onConfirm={async () => { await deleteMutation.mutateAsync(deletePropId); setDeletePropId(null); toast.success('Removed') }} title="Delete Property?" description="This permanently removes the property and all its data." loading={deleteMutation.isPending} />
    </>
  )
}

function PropertyCard({ prop, onEdit, onDelete, updateMutation }) {
  const cur = normCurrency(prop.currency)
  const [showChangeTenant, setShowChangeTenant] = useState(false)
  const [showCheques, setShowCheques] = useState(false)
  const [showMaintenance, setShowMaintenance] = useState(false)
  const { history, addMutation: addHistoryMutation } = useTenantHistory(prop.id)
  const { cheques } = useOwnedCheques(prop.id)
  const { fees } = useMaintenanceFees(prop.id)

  const daysLeft = daysUntil(prop.contractEndDate)

  const currentTenant = prop.tenantName ? {
    id: 'current', isCurrent: true,
    tenantName: prop.tenantName, tenantContact: prop.tenantContact,
    contractStartDate: prop.contractStartDate, contractEndDate: prop.contractEndDate,
    annualRent: prop.annualRent, numberOfCheques: prop.numberOfCheques,
    contractUrl: prop.tenantContractUrl, chequeUrl: prop.tenantChequeUrl,
  } : null

  const handleChangeTenant = async () => {
    try {
      await addHistoryMutation.mutateAsync({
        tenantName: prop.tenantName, tenantContact: prop.tenantContact || '',
        contractStartDate: prop.contractStartDate || '', contractEndDate: prop.contractEndDate || '',
        annualRent: prop.annualRent || 0, numberOfCheques: prop.numberOfCheques || 0,
        contractUrl: prop.tenantContractUrl || '', chequeUrl: prop.tenantChequeUrl || '',
      })
      await updateMutation.mutateAsync({ id: prop.id, data: { tenantName: '', tenantContact: '', contractStartDate: '', contractEndDate: '', annualRent: 0, numberOfCheques: 0, tenantContractUrl: '', tenantChequeUrl: '' } })
      setShowChangeTenant(false)
      onEdit({ ...prop, tenantName: '', tenantContact: '', contractStartDate: '', contractEndDate: '', annualRent: 0, numberOfCheques: 0 })
      toast.success('Tenant archived — enter new tenant details')
    } catch (err) { console.error(err); toast.error('Failed') }
  }

  return (
    <div className="rounded-[var(--radius-xl)] overflow-hidden bg-[var(--surface)] border border-[var(--card-border)] shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-lg)]">
      {/* Property Header */}
      <div className="flex items-center gap-3.5 p-5 border-b border-[var(--border)]">
        <div
          className="w-11 h-11 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0 shadow-[var(--brand-glow)]"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <Building2 size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[var(--text-1)] truncate">
            {prop.buildingName}
            {prop.roomNumber && <span className="text-[var(--text-2)] font-medium"> · Room {prop.roomNumber}</span>}
          </h3>
          {prop.loanBank && (
            <p className="text-xs text-[var(--text-2)] mt-0.5 flex items-center gap-1.5">
              <Banknote size={12} />
              {prop.loanBank} · {formatCurrency(prop.loanEMI, cur)}/mo · {formatCurrency(prop.loanBalance, cur)} remaining
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(prop)}
            className="p-2 rounded-[var(--radius-lg)] text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--accent-text)] transition-all"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-[var(--radius-lg)] text-[var(--text-3)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] transition-all"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Contract expiry alert */}
        {daysLeft !== null && daysLeft <= 60 && daysLeft >= 0 && (
          <div className={cn(
            'flex items-start gap-3 px-4 py-3 rounded-[var(--radius-lg)] text-sm font-medium',
            daysLeft <= 14 ? 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]' : 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning-border)]'
          )}>
            <Clock size={15} className="shrink-0 mt-0.5" />
            <span>
              Tenant contract expires in <strong>{daysLeft} days</strong> ({formatDate(prop.contractEndDate)}).
            </span>
          </div>
        )}

        {/* Active Tenant */}
        {currentTenant ? (
          <ActiveTenantCard
            tenant={currentTenant}
            propId={prop.id}
            currency={cur}
            updateMutation={updateMutation}
            onChangeTenant={() => setShowChangeTenant(true)}
          />
        ) : (
          <div className="flex items-center justify-between p-4 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)]">
            <div className="flex items-center gap-3 text-[var(--text-3)]">
              <Users size={17} />
              <span className="text-sm">No current tenant</span>
            </div>
            <Button size="sm" onClick={() => onEdit(prop)}>Add Tenant</Button>
          </div>
        )}

        {/* Tenant History */}
        {history.length > 0 && (
          <TenantHistoryList history={history} propId={prop.id} currency={cur} />
        )}

        {/* Expandable sections */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowCheques(v => !v)}
            className="flex items-center justify-between px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-1)]">
              <Receipt size={15} className="text-[var(--accent-text)]" />
              Cheques
              {cheques.length > 0 && (
                <span className="text-[10px] bg-[var(--accent)] text-white px-1.5 py-0.5 rounded-full font-semibold">{cheques.length}</span>
              )}
            </div>
            {showCheques ? <ChevronUp size={14} className="text-[var(--text-3)]" /> : <ChevronDown size={14} className="text-[var(--text-3)]" />}
          </button>
          <button
            onClick={() => setShowMaintenance(v => !v)}
            className="flex items-center justify-between px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-1)]">
              <Wrench size={15} className="text-[var(--warning)]" />
              Maintenance
              {fees.length > 0 && (
                <span className="text-[10px] bg-[var(--warning)] text-white px-1.5 py-0.5 rounded-full font-semibold">{fees.length}</span>
              )}
            </div>
            {showMaintenance ? <ChevronUp size={14} className="text-[var(--text-3)]" /> : <ChevronDown size={14} className="text-[var(--text-3)]" />}
          </button>
        </div>

        {showCheques && <ChequeSection propId={prop.id} currency={cur} />}
        {showMaintenance && <MaintenanceFeeSection propId={prop.id} currency={cur} />}
      </div>

      <ConfirmModal
        open={showChangeTenant}
        onClose={() => setShowChangeTenant(false)}
        onConfirm={handleChangeTenant}
        title="Change Tenant?"
        description="Current tenant will be archived to history. You'll then add the new tenant's details."
        confirmLabel="Archive & Change"
        loading={addHistoryMutation.isPending}
      />
    </div>
  )
}

function ActiveTenantCard({ tenant, propId, currency, updateMutation, onChangeTenant }) {
  const [uploading, setUploading] = useState(null)
  const daysLeft = daysUntil(tenant.contractEndDate)

  const daysColor = daysLeft === null ? 'text-[var(--text-2)]'
    : daysLeft > 90 ? 'text-[var(--success)]'
    : daysLeft > 30 ? 'text-[var(--warning)]'
    : 'text-[var(--danger)]'

  const handlePick = async (doc, file) => {
    setUploading(doc.key)
    try {
      const oldUrl = tenant[doc.urlKey]
      const { url } = await uploadPropertyFile('owned', propId, `tenant_current/${doc.key}`, file)
      await updateMutation.mutateAsync({ id: propId, data: { [doc.field]: url } })
      if (oldUrl) deleteFileByUrl(oldUrl) // best-effort cleanup of the replaced file
      toast.success('Uploaded')
    } catch (err) { console.error(err); toast.error('Upload failed') }
    finally { setUploading(null) }
  }

  const handleDelete = async (doc) => {
    setUploading(doc.key)
    try {
      await deleteFileByUrl(tenant[doc.urlKey])
      await updateMutation.mutateAsync({ id: propId, data: { [doc.field]: '' } })
      toast.success('Removed')
    } catch (err) { console.error(err); toast.error('Failed') }
    finally { setUploading(null) }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--success-border)] bg-[var(--success-bg)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-[var(--success-border)]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse-dot" />
          <span className="text-xs font-semibold text-[var(--success)] uppercase tracking-wide">Active Tenant</span>
        </div>
        <button
          onClick={onChangeTenant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] border border-[var(--border)] transition-all"
        >
          <UserX size={12} /> Change
        </button>
      </div>

      <div className="px-4 py-3">
        <p className="text-base font-bold text-[var(--text-1)]">{tenant.tenantName}</p>
        {tenant.tenantContact && (
          <p className="flex items-center gap-1.5 text-sm text-[var(--text-2)] mt-0.5">
            <Phone size={12} /> {tenant.tenantContact}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
          {[
            { label: 'Annual Rent', value: formatCurrency(tenant.annualRent, currency), span: true },
            { label: 'Cheques', value: tenant.numberOfCheques || '—' },
            { label: 'Days Left', value: daysLeft !== null ? daysLeft : '—', className: daysColor },
          ].map(item => (
            <div key={item.label} className={cn('bg-[var(--surface)] rounded-[var(--radius-md)] px-3 py-2.5', item.span && 'col-span-2 md:col-span-1')}>
              <p className="text-xs text-[var(--text-3)] mb-0.5">{item.label}</p>
              <p className={cn('text-sm font-bold text-[var(--text-1)] whitespace-nowrap', item.className)}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3 text-xs text-[var(--text-3)]">
          <CalendarDays size={12} />
          <span>{formatDate(tenant.contractStartDate)} → {formatDate(tenant.contractEndDate)}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          {TENANT_DOCS.map(doc => (
            <DocSlot
              key={doc.key}
              url={tenant[doc.urlKey]}
              label={doc.label}
              icon={doc.icon}
              busy={uploading === doc.key}
              onPick={file => handlePick(doc, file)}
              onDelete={() => handleDelete(doc)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TenantHistoryList({ history, propId, currency }) {
  const [expanded, setExpanded] = useState(false)
  const { updateMutation, deleteMutation } = useTenantHistory(propId)

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between py-2 text-xs font-semibold text-[var(--text-3)] uppercase tracking-wide hover:text-[var(--text-1)] transition-colors"
      >
        <span className="flex items-center gap-2">
          <Users size={12} />
          Tenant History ({history.length})
        </span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {expanded && (
        <div className="space-y-0 mt-1">
          {history.map((h, idx) => (
            <TenantHistoryRow key={h.id} tenant={h} propId={propId} currency={currency} updateMutation={updateMutation} deleteMutation={deleteMutation} isLast={idx === history.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function TenantHistoryRow({ tenant, propId, currency, updateMutation, deleteMutation, isLast }) {
  const [uploading, setUploading] = useState(null)

  const handlePick = async (doc, file) => {
    setUploading(doc.key)
    try {
      const oldUrl = tenant[doc.urlKey]
      const { url } = await uploadPropertyFile('owned', propId, `tenant_history/${tenant.id}/${doc.key}`, file)
      await updateMutation.mutateAsync({ id: tenant.id, data: { [doc.urlKey]: url } })
      if (oldUrl) deleteFileByUrl(oldUrl)
      toast.success('Uploaded')
    } catch (err) { console.error(err); toast.error('Upload failed') }
    finally { setUploading(null) }
  }

  const handleDelete = async (doc) => {
    setUploading(doc.key)
    try {
      await deleteFileByUrl(tenant[doc.urlKey])
      await updateMutation.mutateAsync({ id: tenant.id, data: { [doc.urlKey]: '' } })
      toast.success('Removed')
    } catch (err) { console.error(err); toast.error('Failed') }
    finally { setUploading(null) }
  }

  return (
    <div className={cn('flex gap-3 pb-3', !isLast && 'border-b border-[var(--border)] mb-3')}>
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-[var(--border-strong)] border-2 border-[var(--surface)]" />
        {!isLast && <div className="w-px flex-1 bg-[var(--border)] mt-1" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-1)]">{tenant.tenantName}</p>
            {tenant.tenantContact && <p className="text-xs text-[var(--text-2)]">{tenant.tenantContact}</p>}
            <p className="text-xs text-[var(--text-3)] mt-0.5">
              {formatDate(tenant.contractStartDate)} → {formatDate(tenant.contractEndDate)}
            </p>
            <p className="text-xs text-[var(--text-3)]">
              {formatCurrency(tenant.annualRent, currency)}/yr
              {tenant.numberOfCheques > 0 && ` · ${tenant.numberOfCheques} cheques`}
            </p>
          </div>
          <button
            onClick={() => deleteMutation.mutate(tenant.id)}
            className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-3)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-all shrink-0"
          >
            <Trash2 size={13} />
          </button>
        </div>

        <div className="flex gap-2 mt-2">
          {HISTORY_DOCS.map(doc => (
            <DocSlot
              key={doc.key}
              url={tenant[doc.urlKey]}
              label={doc.label}
              icon={doc.icon}
              compact
              busy={uploading === doc.key}
              onPick={file => handlePick(doc, file)}
              onDelete={() => handleDelete(doc)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChequeSection({ propId, currency }) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(BLANK_CHEQUE)
  const { cheques, addMutation, updateMutation, deleteMutation } = useOwnedCheques(propId)
  const { accounts: allAccounts } = useBankAccounts()
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
      if (editId) {
        const prev = cheques.find(c => c.id === editId)
        const posted = await reconcileChequePosting({ prev, next, incoming: true, sourceId: editId, label })
        await updateMutation.mutateAsync({ id: editId, data: { ...next, ...posted } })
      } else {
        const docRef = await addMutation.mutateAsync({ ...next, postedAmount: 0, postedAccountId: '' })
        const posted = await reconcileChequePosting({ prev: null, next, incoming: true, sourceId: docRef.id, label })
        if (posted.postedAmount) await updateMutation.mutateAsync({ id: docRef.id, data: posted })
      }
      refreshBank()
      setShowForm(false); setEditId(null); toast.success('Saved')
    } catch (err) { console.error(err); toast.error('Failed to save') }
  }

  const handleDelete = async (c) => {
    try {
      await reverseChequePosting({ cheque: c, incoming: true, sourceId: c.id, label: `Rent cheque #${c.chequeNumber || ''}`.trim() })
      await deleteMutation.mutateAsync(c.id)
      refreshBank()
    } catch (err) { console.error(err); toast.error('Failed to delete') }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-2)]">
        <span className="section-label">Cheques ({cheques.length})</span>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      {cheques.length > 0 && (
        <div className="divide-y divide-[var(--border)]">
          {cheques.map(c => (
            <div key={c.id} className="px-4 py-3 hover:bg-[var(--surface-2)] transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-1)] truncate">#{c.chequeNumber}</p>
                  {c.accountId && <Landmark size={11} className="text-[var(--accent-text)] shrink-0" title="Posts to a bank account when cleared" />}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusBadge status={c.status} />
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--accent-text)] transition-all"><Pencil size={12} /></button>
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
      )}
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
              label="Deposit into account (when cleared)"
              hint="Once this cheque is marked Cleared, its amount is added to this account's balance (and reversed if you un-clear or delete it). Leave blank to skip."
              value={form.accountId || ''}
              onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
            >
              <option value="">— Don't touch any balance —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName}{a.accountType ? ` · ${a.accountType}` : ''}</option>)}
            </Select>
          )}
          <Button onClick={handleSave} className="w-full">Save Cheque</Button>
        </div>
      </Modal>
    </div>
  )
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const QUARTER_LABELS = { Q1: 'Jan – Mar', Q2: 'Apr – Jun', Q3: 'Jul – Sep', Q4: 'Oct – Dec' }
const BLANK_FEE_Q = { year: String(new Date().getFullYear()), quarter: 'Q1', amount: '', datePaid: '', receiptRef: '', status: 'pending' }

function MaintenanceFeeSection({ propId, currency }) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(BLANK_FEE_Q)
  const { fees, addMutation, updateMutation, deleteMutation } = useMaintenanceFees(propId)

  const byYear = fees.reduce((acc, f) => {
    const y = f.year || new Date(f.date || Date.now()).getFullYear()
    if (!acc[y]) acc[y] = {}
    const q = f.quarter || 'Q1'
    acc[y][q] = f
    return acc
  }, {})
  const years = Object.keys(byYear).sort((a, b) => b - a)
  const totalPaid = fees.filter(f => f.status === 'paid').reduce((s, f) => s + (f.amount || 0), 0)

  const openAdd = () => { setForm(BLANK_FEE_Q); setEditId(null); setShowForm(true) }
  const openEdit = (f) => {
    setForm({ year: String(f.year || ''), quarter: f.quarter || 'Q1', amount: String(f.amount || ''), datePaid: toDateInput(f.datePaid), receiptRef: f.receiptRef || '', status: f.status || 'pending' })
    setEditId(f.id); setShowForm(true)
  }

  const handleSave = async () => {
    const data = { ...form, year: Number(form.year), amount: Number(form.amount) || 0 }
    if (editId) await updateMutation.mutateAsync({ id: editId, data })
    else await addMutation.mutateAsync(data)
    setShowForm(false); setEditId(null); toast.success('Saved')
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--border)]">
        <div className="min-w-0">
          <p className="section-label">Maintenance Fees</p>
          {totalPaid > 0 && (
            <p className="text-xs font-semibold text-[var(--success)] mt-0.5">{formatCurrency(totalPaid, currency)} paid</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] text-xs font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] whitespace-nowrap transition-colors"
        >
          <Plus size={13} strokeWidth={2.5} /> Add Quarter
        </button>
      </div>

      {years.length > 0 && (
        <div className="divide-y divide-[var(--border)]">
          {years.map(year => (
            <div key={year} className="px-4 py-3">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-xs font-bold text-[var(--text-2)] tracking-wide">{year}</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {QUARTERS.map(q => {
                  const fee = byYear[year]?.[q]
                  return (
                    <div
                      key={q}
                      onClick={() => fee ? openEdit(fee) : null}
                      className={cn(
                        'rounded-[var(--radius-md)] p-2.5 text-center transition-colors',
                        fee?.status === 'paid'
                          ? 'bg-[var(--success-bg)] border border-[var(--success-border)] cursor-pointer hover:opacity-80'
                          : fee
                          ? 'bg-[var(--warning-bg)] border border-[var(--warning-border)] cursor-pointer hover:opacity-80'
                          : 'bg-[var(--surface-2)] border border-dashed border-[var(--border)]'
                      )}
                    >
                      <p className="text-xs font-bold text-[var(--text-1)]">{q}</p>
                      <p className="text-[10px] text-[var(--text-3)] mt-0.5">{QUARTER_LABELS[q]}</p>
                      {fee ? (
                        <>
                          <p className={cn('text-xs font-semibold mt-1', fee.status === 'paid' ? 'text-[var(--success)]' : 'text-[var(--warning)]')}>
                            {formatCurrency(fee.amount, currency)}
                          </p>
                          <p className={cn('text-[10px] font-medium mt-0.5', fee.status === 'paid' ? 'text-[var(--success)]' : 'text-[var(--warning)]')}>
                            {fee.status === 'paid' ? '✓ Paid' : 'Pending'}
                          </p>
                        </>
                      ) : (
                        <p className="text-[10px] text-[var(--text-3)] mt-1">—</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {fees.length === 0 && (
        <p className="text-xs text-[var(--text-3)] text-center py-4">No maintenance fees logged yet</p>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null) }} title={editId ? 'Edit Maintenance Fee' : 'Log Maintenance Fee'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Year" type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2025" />
            <Select label="Quarter" value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: e.target.value }))}>
              {QUARTERS.map(q => <option key={q} value={q}>{q} — {QUARTER_LABELS[q]}</option>)}
            </Select>
          </div>
          <Input label={`Amount (${currency})`} type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
          <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date Paid" type="date" value={form.datePaid} onChange={e => setForm(f => ({ ...f, datePaid: e.target.value }))} />
            <Input label="Receipt Ref" value={form.receiptRef} onChange={e => setForm(f => ({ ...f, receiptRef: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            {editId && (
              <Button variant="destructive" onClick={async () => { await deleteMutation.mutateAsync(editId); setShowForm(false); setEditId(null); toast.success('Removed') }} className="flex-1">Delete</Button>
            )}
            <Button onClick={handleSave} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
