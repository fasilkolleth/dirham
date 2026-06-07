import { useState, useEffect } from 'react'
import { Sun, Moon, LogOut, Plus, Trash2, Pencil, Landmark } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useSettings } from '@/hooks/useSettings'
import { useAuth } from '@/context/AuthContext'
import { useApp } from '@/context/AppContext'
import { useBudget } from '@/hooks/useBudget'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { formatCurrency } from '@/utils/currencyFormatter'
import { normCurrency, currencyMeta } from '@/utils/currencies'
import { requestNotificationPermission } from '@/services/fcm'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme, activeCurrency } = useApp()
  const { settings, saveMutation } = useSettings()

  // Preferred name — the name used in greetings (Google display name may include a prefix)
  const [preferredName, setPreferredName] = useState(settings.preferredName || '')
  useEffect(() => { setPreferredName(settings.preferredName || '') }, [settings.preferredName])
  const nameDirty = preferredName.trim() !== (settings.preferredName || '').trim()

  const handleSaveName = async () => {
    await saveMutation.mutateAsync({ preferredName: preferredName.trim() })
    toast.success('Name updated')
  }

  // Inline threshold state — syncs from Firestore once settings load
  const [thresholds, setThresholds] = useState({
    emiWarningMonths:          settings.emiWarningMonths,
    emiDueWarningDays:         settings.emiDueWarningDays,
    chequeWarningDays:         settings.chequeWarningDays,
    ownedContractWarningDays:  settings.ownedContractWarningDays,
    rentedContractWarningDays: settings.rentedContractWarningDays,
    lendingWarningDays:        settings.lendingWarningDays,
  })
  const [thresholdsDirty, setThresholdsDirty] = useState(false)

  // Sync thresholds whenever Firestore settings arrive (async load)
  useEffect(() => {
    setThresholds({
      emiWarningMonths:          settings.emiWarningMonths,
      emiDueWarningDays:         settings.emiDueWarningDays,
      chequeWarningDays:         settings.chequeWarningDays,
      ownedContractWarningDays:  settings.ownedContractWarningDays,
      rentedContractWarningDays: settings.rentedContractWarningDays,
      lendingWarningDays:        settings.lendingWarningDays,
    })
    setThresholdsDirty(false)
  }, [settings])

  const updateThreshold = (key, value) => {
    setThresholds(prev => ({ ...prev, [key]: value }))
    setThresholdsDirty(true)
  }

  const handleSaveThresholds = async () => {
    const parsed = {
      emiWarningMonths:          Math.max(1, Number(thresholds.emiWarningMonths) || 3),
      emiDueWarningDays:         Math.max(1, Number(thresholds.emiDueWarningDays) || 5),
      chequeWarningDays:         Math.max(1, Number(thresholds.chequeWarningDays) || 7),
      ownedContractWarningDays:  Math.max(1, Number(thresholds.ownedContractWarningDays) || 60),
      rentedContractWarningDays: Math.max(1, Number(thresholds.rentedContractWarningDays) || 60),
      lendingWarningDays:        Math.max(1, Number(thresholds.lendingWarningDays) || 7),
    }
    await saveMutation.mutateAsync(parsed)
    setThresholdsDirty(false)
    toast.success('Alert thresholds saved')
  }

  const handleEnableNotifications = async () => {
    try {
      const token = await requestNotificationPermission()
      if (token) toast.success('Notifications enabled!')
      else toast.info('Notification prompt was dismissed.')
    } catch (err) {
      const messages = {
        not_supported: 'Push notifications are not supported in this browser.',
        permission_denied: 'Permission denied. Enable notifications in your browser settings and try again.',
        messaging_unavailable: 'Firebase Messaging is unavailable in this browser.',
        token_failed: 'Could not register for push notifications. Try reinstalling the app to your Home Screen.',
      }
      toast.error(messages[err.message] || 'Could not enable notifications.')
    }
  }

  return (
    <Layout>
      <Header title="Settings" />

      <div className="px-4 md:px-8 py-4 md:py-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-8 gap-6 md:items-start">

          {/* ── LEFT COLUMN — profile, preferences, budget, sign out ── */}
          <div className="space-y-6">

            {/* Account */}
            <section>
              <p className="section-label mb-3 px-1">Account</p>
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-4">
                    {user?.photoURL ? (
                      <img src={user.photoURL} className="w-14 h-14 rounded-full ring-2 ring-[var(--border)] shrink-0" alt="" />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg, #0062FF 0%, #7C3AED 100%)' }}
                      >
                        {user?.displayName?.[0] || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-[var(--text-1)]">{user?.displayName}</p>
                      <p className="text-sm text-[var(--text-2)] truncate mt-0.5">{user?.email}</p>
                    </div>
                  </div>

                  {/* Preferred name — used for the dashboard greeting */}
                  <div className="mt-5 pt-5 border-t border-[var(--border)]">
                    <label className="block text-xs font-semibold text-[var(--text-3)] uppercase tracking-wide mb-2">
                      Preferred name
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <input
                        value={preferredName}
                        onChange={e => setPreferredName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && nameDirty) handleSaveName() }}
                        placeholder="e.g. Fasil"
                        className="w-full sm:flex-1 h-10 rounded-[var(--radius-md)] px-3 text-sm bg-[var(--surface-2)] text-[var(--text-1)] placeholder:text-[var(--text-3)] border border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-15 outline-none transition-all"
                      />
                      <Button
                        onClick={handleSaveName}
                        disabled={!nameDirty || saveMutation.isPending}
                        size="sm"
                        className="shrink-0 w-full sm:w-auto"
                      >
                        {saveMutation.isPending ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                    <p className="text-[11px] text-[var(--text-3)] mt-2 leading-relaxed">
                      Shown in your dashboard greeting (e.g. “Good evening, {preferredName.trim() || 'Fasil'}”).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Appearance */}
            <section>
              <p className="section-label mb-3 px-1">Appearance</p>
              <Card>
                <CardContent className="pt-0 pb-0">
                  <div className="flex items-center justify-between h-14 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      {theme === 'dark'
                        ? <Moon size={16} className="text-[var(--accent-text)]" />
                        : <Sun size={16} className="text-[var(--warning)]" />
                      }
                      <span className="text-sm font-medium text-[var(--text-1)]">Theme</span>
                    </div>
                    <button onClick={toggleTheme} className="text-sm font-semibold text-[var(--accent-text)] hover:text-[var(--accent)] transition-colors">
                      {theme === 'light' ? 'Light' : 'Dark'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between h-14">
                    <div className="flex items-center gap-3">
                      <span className="text-base leading-none">{currencyMeta(activeCurrency).flag}</span>
                      <span className="text-sm font-medium text-[var(--text-1)]">Currency</span>
                    </div>
                    <span className="text-sm text-[var(--text-2)]">{activeCurrency}</span>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Budget Template — grouped with profile/data setup */}
            <section>
              <p className="section-label mb-3 px-1">Budget Template</p>
              <Card>
                <CardContent className="pt-0 pb-0">
                  <BudgetTemplateSection />
                </CardContent>
              </Card>
            </section>

          </div>

          {/* ── RIGHT COLUMN — notifications & thresholds ───────────── */}
          <div className="space-y-6">

            {/* Alert Thresholds — always visible inline, no modal */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="section-label">Alert Thresholds</p>
                <p className="text-[11px] text-[var(--text-3)]">How far in advance</p>
              </div>
              <Card>
                <CardContent className="pt-4 pb-5">
                  <div className="divide-y divide-[var(--border)]">
                    <ThresholdRow label="EMI ending"               unit="months" value={thresholds.emiWarningMonths}          onChange={v => updateThreshold('emiWarningMonths', v)} />
                    <ThresholdRow label="EMI payment due"          unit="days"   value={thresholds.emiDueWarningDays}         onChange={v => updateThreshold('emiDueWarningDays', v)} />
                    <ThresholdRow label="Owned property contract"  unit="days"   value={thresholds.ownedContractWarningDays}  onChange={v => updateThreshold('ownedContractWarningDays', v)} />
                    <ThresholdRow label="Rented apartment contract" unit="days"  value={thresholds.rentedContractWarningDays} onChange={v => updateThreshold('rentedContractWarningDays', v)} />
                    <ThresholdRow label="Cheque due"               unit="days"   value={thresholds.chequeWarningDays}         onChange={v => updateThreshold('chequeWarningDays', v)} />
                    <ThresholdRow label="Lending repayment"        unit="days"   value={thresholds.lendingWarningDays}        onChange={v => updateThreshold('lendingWarningDays', v)} />
                  </div>

                  {/* Save button — visually distinct between saved and dirty states */}
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    {thresholdsDirty ? (
                      <Button
                        onClick={handleSaveThresholds}
                        disabled={saveMutation.isPending}
                        className="w-full"
                      >
                        {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
                      </Button>
                    ) : (
                      <div className="w-full h-9 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--success-bg)] border border-[var(--success-border)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                        <span className="text-xs font-medium text-[var(--success)]">All changes saved</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Push Notifications */}
            <section>
              <p className="section-label mb-3 px-1">Push Notifications</p>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-[var(--text-2)] mb-3 leading-relaxed">
                    Receive alerts for due payments, expiring contracts, and more — even when the app is closed.
                  </p>
                  <Button variant="secondary" onClick={handleEnableNotifications} className="w-full">
                    Enable Push Notifications
                  </Button>
                </CardContent>
              </Card>
            </section>

          </div>

          {/* Sign Out — spans full width at the very bottom on both layouts */}
          <section className="md:col-span-2">
            <Card>
              <CardContent className="pt-0 pb-0">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 h-14 text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors rounded-[var(--radius-lg)] px-0"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-semibold">Sign Out</span>
                </button>
              </CardContent>
            </Card>
          </section>

          <p className="md:col-span-2 text-xs text-[var(--text-3)] text-center pb-4">Dirham v1.0</p>
        </div>
      </div>
    </Layout>
  )
}

/* ── Threshold Row ────────────────────────────────────────────────────────── */

function ThresholdRow({ label, unit, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <span className="text-sm text-[var(--text-1)] flex-1 min-w-0 truncate">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          min="1"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className="w-16 h-9 rounded-[var(--radius-md)] px-2.5 text-sm font-semibold text-center bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-15 outline-none transition-all"
        />
        <span className="text-xs text-[var(--text-3)] w-11">{unit}</span>
      </div>
    </div>
  )
}

/* ── Budget Template ─────────────────────────────────────────────────────── */

function BudgetTemplateSection() {
  const [showForm, setShowForm] = useState(false)
  const [editIdx, setEditIdx] = useState(null)
  const [form, setForm] = useState({ category: '', type: 'expense', planned: '', accountId: '' })
  const { template, saveTemplateMutation } = useBudget()
  const { accounts: allAccounts } = useBankAccounts()
  const { activeCurrency } = useApp()
  // Template is per-currency now; only offer same-currency accounts to link.
  const accounts = allAccounts.filter(a => normCurrency(a.currency) === activeCurrency)
  const items = template?.items || []

  const handleSave = async () => {
    if (!form.category.trim()) return toast.error('Enter category name')
    let newItems
    if (editIdx !== null) {
      newItems = items.map((it, i) => i === editIdx ? { ...it, ...form, planned: Number(form.planned) || 0 } : it)
    } else {
      newItems = [...items, { ...form, planned: Number(form.planned) || 0, id: crypto.randomUUID() }]
    }
    await saveTemplateMutation.mutateAsync({ items: newItems })
    setShowForm(false)
    toast.success('Template updated')
  }

  const handleDelete = async (idx) => {
    const newItems = items.filter((_, i) => i !== idx)
    await saveTemplateMutation.mutateAsync({ items: newItems })
    toast.success('Removed')
  }

  return (
    <>
      <div className="flex items-center justify-between h-12 border-b border-[var(--border)]">
        <div>
          <span className="text-sm font-medium text-[var(--text-1)]">Recurring Categories</span>
          {items.length > 0 && (
            <span className="ml-2 text-xs text-[var(--text-3)]">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <button
          onClick={() => { setForm({ category: '', type: 'expense', planned: '', accountId: '' }); setEditIdx(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 h-7 rounded-[var(--radius-md)] text-xs font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Plus size={12} strokeWidth={2.5} /> Add
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-[var(--text-3)] py-4 text-center leading-relaxed">
          Add recurring budget categories here.<br />Each new month, load them with one tap.
        </p>
      )}

      {items.length > 0 && (
        <div className="divide-y divide-[var(--border)]">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 group">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <CategoryIcon name={item.category} type={item.type} />
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-sm font-medium text-[var(--text-1)] truncate">{item.category}</span>
                  <span className="text-xs text-[var(--text-3)] capitalize shrink-0">{item.type}</span>
                  {item.accountId && <Landmark size={11} className="shrink-0 text-[var(--accent-text)]" />}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-[var(--text-1)]">{formatCurrency(item.planned, activeCurrency)}</span>
                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setForm({ category: item.category, type: item.type, planned: String(item.planned), accountId: item.accountId || '' }); setEditIdx(i); setShowForm(true) }}
                    className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-3)] hover:text-[var(--accent-text)] hover:bg-[var(--accent-light)] transition-all"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(i)}
                    className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-3)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editIdx !== null ? 'Edit Template Item' : 'Add Template Item'}>
        <div className="space-y-4">
          <Input label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. FAB Credit Card, Groceries" />
          <div className="flex gap-2">
            {['expense', 'income'].map(t => (
              <button
                key={t}
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 h-10 rounded-[var(--radius-lg)] text-sm font-medium transition-all ${form.type === t ? 'text-white' : 'bg-[var(--surface-2)] text-[var(--text-2)]'}`}
                style={form.type === t ? { background: 'var(--accent)' } : {}}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <Input label={`Default Amount (${activeCurrency})`} type="number" value={form.planned} onChange={e => setForm(f => ({ ...f, planned: e.target.value }))} placeholder="0" />
          {accounts.length > 0 && (
            <Select
              label={form.type === 'income' ? 'Receive into account (optional)' : 'Pay from account (optional)'}
              hint="If linked, copying this to a month carries the link — the actual then posts to this account. Leave blank for items tracked elsewhere (e.g. EMI, Rent)."
              value={form.accountId || ''}
              onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
            >
              <option value="">— Don't link to a bank —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName}{a.accountType ? ` · ${a.accountType}` : ''}</option>)}
            </Select>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
