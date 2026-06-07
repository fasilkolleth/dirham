import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTransfers, addTransfer, deleteTransfer, adjustAccountBalance } from '@/services/firestore'

export function useTransfers() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['transfers'] })
    qc.invalidateQueries({ queryKey: ['bank_accounts'] })
  }

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: async () => {
      const snap = await listTransfers()
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    staleTime: 30_000,
  })

  // One event, two postings: debit the source, credit the destination. Net zero.
  const addMutation = useMutation({
    mutationFn: async (data) => {
      const amount = Number(data.amount) || 0
      const docRef = await addTransfer({
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        fromName: data.fromName || '',
        toName: data.toName || '',
        amount,
        note: data.note || '',
        date: data.date || new Date().toISOString().split('T')[0],
      })
      await adjustAccountBalance(data.fromAccountId, -amount, {
        reason: `Transfer to ${data.toName || 'account'}`, sourceType: 'transfer', sourceId: docRef.id,
      })
      await adjustAccountBalance(data.toAccountId, amount, {
        reason: `Transfer from ${data.fromName || 'account'}`, sourceType: 'transfer', sourceId: docRef.id,
      })
    },
    onSuccess: refresh,
  })

  // Deleting a transfer cleanly reverses both postings.
  const deleteMutation = useMutation({
    mutationFn: async (transfer) => {
      const amount = Number(transfer.amount) || 0
      await adjustAccountBalance(transfer.fromAccountId, amount, {
        reason: `Transfer to ${transfer.toName || 'account'} reversed`, sourceType: 'transfer', sourceId: transfer.id,
      })
      await adjustAccountBalance(transfer.toAccountId, -amount, {
        reason: `Transfer from ${transfer.fromName || 'account'} reversed`, sourceType: 'transfer', sourceId: transfer.id,
      })
      await deleteTransfer(transfer.id)
    },
    onSuccess: refresh,
  })

  return { transfers, isLoading, addMutation, deleteMutation }
}
