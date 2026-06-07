import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Landmark } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useDueCheques } from '@/hooks/useDueCheques'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { formatCurrency } from '@/utils/currencyFormatter'
import { formatDate } from '@/utils/dateHelpers'
import toast from 'react-hot-toast'

export function DueChequesPrompt() {
  const { dueCheques, isLoading, actMutation } = useDueCheques()
  const { accounts } = useBankAccounts()
  const [dismissed, setDismissed] = useState(false)

  // Mounted once at the app root, so this stays open across navigation and
  // closes on its own once every due cheque has been actioned away.
  if (isLoading || dismissed || dueCheques.length === 0) return null

  const accName = (id) => accounts.find(a => a.id === id)?.bankName

  const act = async (cheque, status) => {
    try {
      await actMutation.mutateAsync({ cheque, status })
      toast.success(status === 'cleared' ? 'Cleared — bank updated' : 'Marked bounced')
    } catch (err) { console.error(err); toast.error('Failed') }
  }

  return (
    <Modal open onClose={() => setDismissed(true)} title="Cheques due">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          These cheques have reached their due date. Mark the ones that have actually cleared in your bank — the balance updates automatically.
        </p>

        <div className="space-y-2.5 max-h-[55vh] overflow-y-auto -mx-1 px-1">
          {dueCheques.map(c => (
            <div key={c.id} className="rounded-[var(--radius-lg)] border border-[var(--border)] p-3">
              <p className="text-sm font-medium text-[var(--text-1)] truncate flex items-center gap-1.5">
                {c.incoming
                  ? <ArrowDownLeft size={13} className="text-[var(--success)] shrink-0" />
                  : <ArrowUpRight size={13} className="text-[var(--danger)] shrink-0" />}
                <span className="truncate">{c.propertyName} · #{c.chequeNumber}</span>
              </p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">
                {formatCurrency(c.amount, c.currency)} · due {formatDate(c.dueDate)}
              </p>
              {c.accountId ? (
                <p className="text-[11px] text-[var(--accent-text)] mt-1 flex items-center gap-1">
                  <Landmark size={10} className="shrink-0" />
                  {c.incoming ? 'Deposits to' : 'Paid from'} {accName(c.accountId) || 'linked account'}
                </p>
              ) : (
                <p className="text-[11px] text-[var(--text-3)] mt-1">No bank account linked — won't change any balance</p>
              )}
              <div className="flex gap-2 mt-2.5">
                <Button size="sm" onClick={() => act(c, 'cleared')} disabled={actMutation.isPending} className="flex-1">Cleared</Button>
                <Button size="sm" variant="secondary" onClick={() => act(c, 'bounced')} disabled={actMutation.isPending}>Bounced</Button>
              </div>
            </div>
          ))}
        </div>

        <Button variant="ghost" onClick={() => setDismissed(true)} className="w-full">Later</Button>
      </div>
    </Modal>
  )
}
