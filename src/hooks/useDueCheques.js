import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listAllCheques, updateOwnedCheque, updateRentedCheque } from '@/services/firestore'
import { useOwnedProperties, useRentedProperties } from '@/hooks/useProperties'
import { useApp } from '@/context/AppContext'
import { normCurrency } from '@/utils/currencies'
import { reconcileChequePosting } from '@/utils/chequePosting'
import { daysUntil } from '@/utils/dateHelpers'

export function useDueCheques() {
  const qc = useQueryClient()
  const { activeCurrency } = useApp()
  const { properties: owned } = useOwnedProperties()
  const { properties: rented } = useRentedProperties()

  const { data: all = [], isLoading } = useQuery({
    queryKey: ['all_cheques'],
    queryFn: async () => {
      const snap = await listAllCheques()
      return snap.docs.map(d => {
        const propDoc = d.ref.parent.parent          // property_owned/{id} or property_rented/{id}
        const collectionId = propDoc.parent.id        // 'property_owned' | 'property_rented'
        return { id: d.id, propId: propDoc.id, incoming: collectionId === 'property_owned', ...d.data() }
      })
    },
    staleTime: 30_000,
  })

  const propFor = (c) => (c.incoming ? owned : rented).find(x => x.id === c.propId)
  const nameFor = (p) => {
    if (!p) return 'Property'
    return [p.buildingName, p.roomNumber].filter(Boolean).join(' · ') || 'Property'
  }

  // Pending cheques due today/past, in the active currency world only. Each
  // cheque inherits its property's currency for correct formatting.
  const dueCheques = all
    .filter(c => c.status === 'pending' && c.dueDate && (daysUntil(c.dueDate) ?? 99) <= 0)
    .map(c => {
      const p = propFor(c)
      return { ...c, propertyName: nameFor(p), currency: normCurrency(p?.currency) }
    })
    .filter(c => c.currency === activeCurrency)
    .sort((a, b) => (daysUntil(a.dueDate) ?? 0) - (daysUntil(b.dueDate) ?? 0))

  // Mark a cheque cleared (posts to its account) or bounced (no posting), from the prompt.
  const actMutation = useMutation({
    mutationFn: async ({ cheque, status }) => {
      const next = { ...cheque, status }
      const label = `Rent cheque #${cheque.chequeNumber || ''}`.trim()
      const posted = await reconcileChequePosting({ prev: cheque, next, incoming: cheque.incoming, sourceId: cheque.id, label })
      const update = cheque.incoming ? updateOwnedCheque : updateRentedCheque
      await update(cheque.propId, cheque.id, { status, ...posted })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all_cheques'] })
      qc.invalidateQueries({ queryKey: ['owned_cheques'] })
      qc.invalidateQueries({ queryKey: ['rented_cheques'] })
      qc.invalidateQueries({ queryKey: ['bank_accounts'] })
    },
  })

  return { dueCheques, isLoading, actMutation }
}
