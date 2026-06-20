import { useState, useEffect } from 'react'
import { Sun, Moon, LogOut, Plus, Trash2, Pencil, Landmark, CalendarDays, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react'
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
import { useCalendarSync } from '@/hooks/useCalendarSync'
import { MAX_EARLY_REMINDER_DAYS } from '@/services/googleCalendar'
import { useBudget } from '@/hooks/useBudget'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { formatCurrency } from '@/utils/currencyFormatter'
import { normCurrency, currencyMeta } from '@/utils/currencies'
import {
  getDocs, collection, doc,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import {
  updateEMI, updateLending, updateBorrowing,
  updateOwnedProperty, updateOwnedCheque,
  updateRentedProperty, updateRentedCheque,
} from '@/services/firestore'
import toast from 'react-hot-toast'

function formatTime(time24) {
  if (!time24) return '9:00 AM'
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

const CALENDAR_OPTIONS = [
  { value: 'off',           label: 'Off' },
  { value: 'due_date',      label: 'Due date only' },
  { value: 'early_and_due', label: 'Early + due date' },
]

const CALENDAR_DEFAULTS = {
  emiCalendar:            'early_and_due',
  emiDueCalendar:         'due_date',
  chequeCalendar:         'early_and_due',
  ownedContractCalendar:  'early_and_due',
  rentedContractCalendar: 'early_and_due',
  lendingCalendar:        'due_date',
}

export default function SettingsPage() {
  const { user, logout, calendarToken, connectGoogleCalendar } = useAuth()
  const { theme, toggleTheme, activeCurrency } = useApp()
  const { settings, saveMutation } = useSettings()
  const calSync = useCalendarSync()

  // ── Preferred name ──────────────────────────────────────────────────────────
  const [preferredName, setPreferredName] = useState(settings.preferredName || '')
  useEffect(() => { setPreferredName(settings.preferredName || '') }, [settings.preferredName])
  const nameDirty = preferredName.trim() !== (settings.preferredName || '').trim()

  const handleSaveName = async () => {
    await saveMutation.mutateAsync({ preferredName: preferredName.trim() })
    toast.success('Name updated')
  }

  // ── Alert thresholds + calendar settings ────────────────────────────────────
  const [thresholds, setThresholds] = useState({
    emiWarningDays:            settings.emiWarningDays,
    emiDueWarningDays:         settings.emiDueWarningDays,
    chequeWarningDays:         settings.chequeWarningDays,
    ownedContractWarningDays:  settings.ownedContractWarningDays,
    rentedContractWarningDays: settings.rentedContractWarningDays,
    lendingWarningDays:        settings.lendingWarningDays,
    borrowingWarningDays:      settings.borrowingWarningDays,
  })
  const [calendarSettings, setCalendarSettings] = useState({
    emiCalendar:            settings.emiCalendar            ?? CALENDAR_DEFAULTS.emiCalendar,
    emiDueCalendar:         settings.emiDueCalendar         ?? CALENDAR_DEFAULTS.emiDueCalendar,
    chequeCalendar:         settings.chequeCalendar         ?? CALENDAR_DEFAULTS.chequeCalendar,
    ownedContractCalendar:  settings.ownedContractCalendar  ?? CALENDAR_DEFAULTS.ownedContractCalendar,
    rentedContractCalendar: settings.rentedContractCalendar ?? CALENDAR_DEFAULTS.rentedContractCalendar,
    lendingCalendar:        settings.lendingCalendar        ?? CALENDAR_DEFAULTS.lendingCalendar,
    borrowingCalendar:      settings.borrowingCalendar      ?? 'due_date',
    calendarReminderTime:   settings.calendarReminderTime   ?? '09:00',
  })
  const [settingsDirty, setSettingsDirty] = useState(false)

  useEffect(() => {
    setThresholds({
      emiWarningDays:            settings.emiWarningDays,
      emiDueWarningDays:         settings.emiDueWarningDays,
      chequeWarningDays:         settings.chequeWarningDays,
      ownedContractWarningDays:  settings.ownedContractWarningDays,
      rentedContractWarningDays: settings.rentedContractWarningDays,
      lendingWarningDays:        settings.lendingWarningDays,
      borrowingWarningDays:      settings.borrowingWarningDays,
    })
    setCalendarSettings({
      emiCalendar:            settings.emiCalendar            ?? CALENDAR_DEFAULTS.emiCalendar,
      emiDueCalendar:         settings.emiDueCalendar         ?? CALENDAR_DEFAULTS.emiDueCalendar,
      chequeCalendar:         settings.chequeCalendar         ?? CALENDAR_DEFAULTS.chequeCalendar,
      ownedContractCalendar:  settings.ownedContractCalendar  ?? CALENDAR_DEFAULTS.ownedContractCalendar,
      rentedContractCalendar: settings.rentedContractCalendar ?? CALENDAR_DEFAULTS.rentedContractCalendar,
      lendingCalendar:        settings.lendingCalendar        ?? CALENDAR_DEFAULTS.lendingCalendar,
      borrowingCalendar:      settings.borrowingCalendar      ?? 'due_date',
      calendarReminderTime:   settings.calendarReminderTime   ?? '09:00',
    })
    setSettingsDirty(false)
  }, [settings])

  const updateThreshold = (key, value) => {
    setThresholds(prev => ({ ...prev, [key]: value }))
    setSettingsDirty(true)
  }
  const updateCalendar = (key, value) => {
    setCalendarSettings(prev => ({ ...prev, [key]: value }))
    setSettingsDirty(true)
  }

  const handleSaveSettings = async () => {
    await saveMutation.mutateAsync({
      emiWarningDays:            Math.max(1, Number(thresholds.emiWarningDays) || 90),
      emiDueWarningDays:         Math.max(1, Number(thresholds.emiDueWarningDays) || 5),
      chequeWarningDays:         Math.max(1, Number(thresholds.chequeWarningDays) || 7),
      ownedContractWarningDays:  Math.max(1, Number(thresholds.ownedContractWarningDays) || 60),
      rentedContractWarningDays: Math.max(1, Number(thresholds.rentedContractWarningDays) || 60),
      lendingWarningDays:        Math.max(1, Number(thresholds.lendingWarningDays) || 7),
      borrowingWarningDays:      Math.max(1, Number(thresholds.borrowingWarningDays) || 7),
      ...calendarSettings,
    })
    setSettingsDirty(false)
    toast.success('Settings saved')
  }

  // ── Google Calendar connect ──────────────────────────────────────────────────
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const handleConnectCalendar = async () => {
    setConnecting(true)
    const ok = await connectGoogleCalendar()
    setConnecting(false)
    if (ok) toast.success('Google Calendar connected!')
    else toast.error('Could not connect Google Calendar.')
  }

  const handleSyncAll = async () => {
    setSyncing(true)
    let count = 0
    try {
      // Fetch all records in parallel
      const [emisSnap, ownedSnap, rentedSnap, lendingsSnap, borrowingsSnap] = await Promise.all([
        getDocs(collection(db, 'emi_tracker')),
        getDocs(collection(db, 'property_owned')),
        getDocs(collection(db, 'property_rented')),
        getDocs(collection(db, 'lending')),
        getDocs(collection(db, 'borrowing')),
      ])

      const emis        = emisSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const ownedProps  = ownedSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const rentedProps = rentedSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const lendings    = lendingsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const borrowings  = borrowingsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Fetch cheques for every property
      const ownedWithCheques = await Promise.all(ownedProps.map(async p => {
        const s = await getDocs(collection(db, 'property_owned', p.id, 'cheques'))
        return { ...p, cheques: s.docs.map(d => ({ id: d.id, ...d.data() })) }
      }))
      const rentedWithCheques = await Promise.all(rentedProps.map(async p => {
        const s = await getDocs(collection(db, 'property_rented', p.id, 'cheques'))
        return { ...p, cheques: s.docs.map(d => ({ id: d.id, ...d.data() })) }
      }))

      // ── EMIs ────────────────────────────────────────────────────────────────
      for (const emi of emis) {
        if (emi.calendarEventId || emi.status === 'closed' || !emi.endDate) continue
        const eventId = await calSync.sync({
          type: 'emi',
          title: `${emi.purpose} EMI ending`,
          description: `${formatCurrency(emi.monthlyAmount, emi.currency)}/month — ${emi.lender}`,
          dueDate: emi.endDate,
        })
        if (eventId) { await updateEMI(emi.id, { calendarEventId: eventId }); count++ }
      }

      // ── Lending ─────────────────────────────────────────────────────────────
      for (const l of lendings) {
        if (l.calendarEventId || l.status === 'settled' || !l.agreedDueDate) continue
        const eventId = await calSync.sync({
          type: 'lending',
          title: `Repayment due — ${l.borrowerName}`,
          description: `${formatCurrency(l.amountLent, l.currency)} lent`,
          dueDate: l.agreedDueDate,
        })
        if (eventId) { await updateLending(l.id, { calendarEventId: eventId }); count++ }
      }

      // ── Owned property contracts ─────────────────────────────────────────────
      for (const p of ownedProps) {
        if (p.calendarEventId || !p.contractEndDate) continue
        const eventId = await calSync.sync({
          type: 'ownedContract',
          title: `Contract expiry — ${p.buildingName}`,
          description: p.tenantName ? `Tenant: ${p.tenantName}` : '',
          dueDate: p.contractEndDate,
        })
        if (eventId) { await updateOwnedProperty(p.id, { calendarEventId: eventId }); count++ }
      }

      // ── Rented property contracts ────────────────────────────────────────────
      for (const p of rentedProps) {
        if (p.calendarEventId || !p.contractEndDate) continue
        const eventId = await calSync.sync({
          type: 'rentedContract',
          title: `Rental contract expiry — ${p.buildingName}`,
          description: p.landlordName ? `Landlord: ${p.landlordName}` : '',
          dueDate: p.contractEndDate,
        })
        if (eventId) { await updateRentedProperty(p.id, { calendarEventId: eventId }); count++ }
      }

      // ── Owned cheques ────────────────────────────────────────────────────────
      for (const p of ownedWithCheques) {
        for (const c of p.cheques) {
          if (c.calendarEventId || c.status === 'cleared' || c.status === 'bounced' || !c.dueDate) continue
          const eventId = await calSync.sync({
            type: 'cheque',
            title: `Cheque due — ${p.buildingName} #${c.chequeNumber}`,
            description: formatCurrency(c.amount, p.currency),
            dueDate: c.dueDate,
          })
          if (eventId) { await updateOwnedCheque(p.id, c.id, { calendarEventId: eventId }); count++ }
        }
      }

      // ── Rented cheques ───────────────────────────────────────────────────────
      for (const p of rentedWithCheques) {
        for (const c of p.cheques) {
          if (c.calendarEventId || c.status === 'cleared' || c.status === 'bounced' || !c.dueDate) continue
          const eventId = await calSync.sync({
            type: 'cheque',
            title: `Rent cheque due — ${p.buildingName} #${c.chequeNumber}`,
            description: formatCurrency(c.amount, p.currency),
            dueDate: c.dueDate,
          })
          if (eventId) { await updateRentedCheque(p.id, c.id, { calendarEventId: eventId }); count++ }
        }
      }

      // ── Borrowing ────────────────────────────────────────────────────────────
      for (const b of borrowings) {
        if (b.calendarEventId || b.status === 'settled' || !b.agreedDueDate) continue
        const eventId = await calSync.sync({
          type: 'borrowing',
          title: `Repayment due to ${b.lenderName}`,
          description: `${formatCurrency(b.amountBorrowed, b.currency)} borrowed`,
          dueDate: b.agreedDueDate,
        })
        if (eventId) { await updateBorrowing(b.id, { calendarEventId: eventId }); count++ }
      }

      if (count === 0) toast.success('All records already synced — nothing new to add.')
      else toast.success(`${count} record${count !== 1 ? 's' : ''} synced to Google Calendar.`)
    } catch (err) {
      console.error(err)
      toast.error('Sync failed. Check your Calendar connection and try again.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Layout>
      <Header title="Settings" />

      <div className="px-4 md:px-8 py-4 md:py-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-8 gap-6 md:items-start">

          {/* ── LEFT COLUMN ── */}
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
                      Shown in your dashboard greeting (e.g. "Good evening, {preferredName.trim() || 'Fasil'}").
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

            {/* Budget Template */}
            <section>
              <p className="section-label mb-3 px-1">Budget Template</p>
              <Card>
                <CardContent className="pt-0 pb-0">
                  <BudgetTemplateSection />
                </CardContent>
              </Card>
            </section>

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-6">

            {/* Google Calendar */}
            <section>
              <p className="section-label mb-3 px-1">Google Calendar</p>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                      style={{ background: calendarToken ? 'var(--success-bg)' : 'var(--surface-2)' }}>
                      <CalendarDays size={18} style={{ color: calendarToken ? 'var(--success)' : 'var(--text-3)' }} />
                    </div>

                    {/* Status text */}
                    <div className="flex-1 min-w-0">
                      {calendarToken ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-[var(--success)] shrink-0" />
                            <span className="text-sm font-semibold text-[var(--text-1)]">Connected</span>
                          </div>
                          <p className="text-xs text-[var(--text-3)] truncate mt-0.5">{user?.email}</p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <AlertCircle size={13} className="text-[var(--warning)] shrink-0" />
                            <span className="text-sm font-semibold text-[var(--text-1)]">Not connected</span>
                          </div>
                          <p className="text-xs text-[var(--text-3)] mt-0.5">Connect to enable calendar reminders</p>
                        </>
                      )}
                    </div>

                    {/* Action button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleConnectCalendar}
                      disabled={connecting}
                      className="shrink-0"
                    >
                      {connecting ? 'Connecting…' : calendarToken ? 'Reconnect' : 'Connect'}
                    </Button>
                  </div>

                  {calendarToken && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-1)]">Sync existing records</p>
                          <p className="text-[11px] text-[var(--text-3)] mt-0.5 leading-relaxed">
                            Create calendar events for all EMIs, cheques, contracts and lending records that were added before you connected Google Calendar.
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleSyncAll}
                          disabled={syncing}
                          className="shrink-0 mt-0.5"
                        >
                          {syncing ? 'Syncing…' : 'Sync All'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {!calendarToken && (
                    <p className="text-[11px] text-[var(--text-3)] mt-3 pt-3 border-t border-[var(--border)] leading-relaxed">
                      Once connected, the app will automatically create calendar events with reminders whenever you add a cheque, EMI, contract or lending record.
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Alerts & Calendar */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="section-label">Alerts & Calendar</p>
                <p className="text-[11px] text-[var(--text-3)]">Warning window</p>
              </div>
              <Card>
                <CardContent className="pt-2 pb-5">

                  {/* Reminder time */}
                  <div className="flex items-center justify-between h-14 border-b border-[var(--border)]">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-1)]">Reminder time</p>
                      <p className="text-[11px] text-[var(--text-3)] mt-0.5">UAE time · applies to all</p>
                    </div>
                    <label className="relative cursor-pointer flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[var(--accent-text)]">
                        {formatTime(calendarSettings.calendarReminderTime)}
                      </span>
                      <ChevronDown size={13} className="text-[var(--accent-text)]" />
                      <input
                        type="time"
                        value={calendarSettings.calendarReminderTime}
                        onChange={e => { setCalendarSettings(prev => ({ ...prev, calendarReminderTime: e.target.value })); setSettingsDirty(true) }}
                        className="absolute inset-0 opacity-0 w-full cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="divide-y divide-[var(--border)]">
                    <AlertCalendarRow
                      label="EMI ending"
                      unit="days"
                      thresholdValue={thresholds.emiWarningDays}
                      onThresholdChange={v => updateThreshold('emiWarningDays', v)}
                      calendarValue={calendarSettings.emiCalendar}
                      onCalendarChange={v => updateCalendar('emiCalendar', v)}
                      calendarConnected={!!calendarToken}
                    />
                    <AlertCalendarRow
                      label="EMI payment due"
                      unit="days"
                      thresholdValue={thresholds.emiDueWarningDays}
                      onThresholdChange={v => updateThreshold('emiDueWarningDays', v)}
                      calendarValue={calendarSettings.emiDueCalendar}
                      onCalendarChange={v => updateCalendar('emiDueCalendar', v)}
                      calendarConnected={!!calendarToken}
                    />
                    <AlertCalendarRow
                      label="Owned property contract"
                      unit="days"
                      thresholdValue={thresholds.ownedContractWarningDays}
                      onThresholdChange={v => updateThreshold('ownedContractWarningDays', v)}
                      calendarValue={calendarSettings.ownedContractCalendar}
                      onCalendarChange={v => updateCalendar('ownedContractCalendar', v)}
                      calendarConnected={!!calendarToken}
                    />
                    <AlertCalendarRow
                      label="Rented apartment contract"
                      unit="days"
                      thresholdValue={thresholds.rentedContractWarningDays}
                      onThresholdChange={v => updateThreshold('rentedContractWarningDays', v)}
                      calendarValue={calendarSettings.rentedContractCalendar}
                      onCalendarChange={v => updateCalendar('rentedContractCalendar', v)}
                      calendarConnected={!!calendarToken}
                    />
                    <AlertCalendarRow
                      label="Cheque due"
                      unit="days"
                      thresholdValue={thresholds.chequeWarningDays}
                      onThresholdChange={v => updateThreshold('chequeWarningDays', v)}
                      calendarValue={calendarSettings.chequeCalendar}
                      onCalendarChange={v => updateCalendar('chequeCalendar', v)}
                      calendarConnected={!!calendarToken}
                    />
                    <AlertCalendarRow
                      label="Lending repayment"
                      unit="days"
                      thresholdValue={thresholds.lendingWarningDays}
                      onThresholdChange={v => updateThreshold('lendingWarningDays', v)}
                      calendarValue={calendarSettings.lendingCalendar}
                      onCalendarChange={v => updateCalendar('lendingCalendar', v)}
                      calendarConnected={!!calendarToken}
                    />
                    <AlertCalendarRow
                      label="Borrowing repayment"
                      unit="days"
                      thresholdValue={thresholds.borrowingWarningDays}
                      onThresholdChange={v => updateThreshold('borrowingWarningDays', v)}
                      calendarValue={calendarSettings.borrowingCalendar}
                      onCalendarChange={v => updateCalendar('borrowingCalendar', v)}
                      calendarConnected={!!calendarToken}
                    />
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    {settingsDirty ? (
                      <Button onClick={handleSaveSettings} disabled={saveMutation.isPending} className="w-full">
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

          </div>

          {/* Sign Out */}
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

/* ── Alert & Calendar Row ─────────────────────────────────────────────────── */

function AlertCalendarRow({ label, unit, thresholdValue, onThresholdChange, calendarValue, onCalendarChange, calendarConnected }) {
  const isActive = calendarConnected && calendarValue !== 'off'
  const earlyExceedsLimit = unit === 'days' && calendarValue === 'early_and_due' && Number(thresholdValue) > MAX_EARLY_REMINDER_DAYS

  return (
    <div className="py-3.5">
      {/* Label + threshold */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="text-sm font-medium text-[var(--text-1)] flex-1 min-w-0">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min="1"
            value={thresholdValue ?? ''}
            onChange={e => onThresholdChange(e.target.value)}
            className="w-14 h-8 rounded-[var(--radius-md)] px-2 text-sm font-bold text-center bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-15 outline-none transition-all"
          />
          <span className="text-xs text-[var(--text-3)] w-10 shrink-0">{unit}</span>
        </div>
      </div>

      {/* Calendar pill selector */}
      <div className="relative">
        <div className={`flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-[var(--radius-full)] border transition-all ${
          !calendarConnected
            ? 'bg-[var(--surface-2)] border-[var(--border)] opacity-50'
            : isActive
              ? 'bg-[var(--accent-light)] border-[var(--accent)]'
              : 'bg-[var(--surface-2)] border-[var(--border)]'
        }`}>
          <CalendarDays size={12} className={`shrink-0 ${isActive ? 'text-[var(--accent-text)]' : 'text-[var(--text-3)]'}`} />
          <select
            value={calendarValue}
            onChange={e => onCalendarChange(e.target.value)}
            disabled={!calendarConnected}
            className={`flex-1 text-xs font-semibold bg-transparent outline-none appearance-none cursor-pointer disabled:cursor-not-allowed ${
              isActive ? 'text-[var(--accent-text)]' : 'text-[var(--text-3)]'
            }`}
          >
            {CALENDAR_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={11} className={`shrink-0 ${isActive ? 'text-[var(--accent-text)]' : 'text-[var(--text-3)]'}`} />
        </div>
        {!calendarConnected && (
          <p className="text-[10px] text-[var(--text-3)] mt-1 pl-1">Connect Google Calendar above to enable</p>
        )}
        {earlyExceedsLimit && (
          <p className="text-[10px] text-[var(--warning)] mt-1 pl-1">
            Google Calendar caps early reminders at {MAX_EARLY_REMINDER_DAYS} days — early alert will fire {MAX_EARLY_REMINDER_DAYS} days before
          </p>
        )}
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
