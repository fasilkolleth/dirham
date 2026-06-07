import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listLending, addLending, updateLending, deleteLending,
  listRepayments, addRepayment, deleteRepayment, adjustAccountBalance,
} from '@/services/firestore'

const enrichLending = (lending) => {
  const totalRepaid = lending.totalRepaid || 0
  const balanceRemaining = Math.max(0, (lending.amountLent || 0) - totalRepaid)
  const status = balanceRemaining === 0 ? 'settled' : totalRepaid > 0 ? 'partially_repaid' : 'active'
  return { ...lending, balanceRemaining, status }
}

export function useLending() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['lending'] })
    qc.invalidateQueries({ queryKey: ['bank_accounts'] })
  }

  const { data: lendings = [], isLoading } = useQuery({
    queryKey: ['lending'],
    queryFn: async () => {
      const snap = await listLending()
      return snap.docs.map(d => enrichLending({ id: d.id, ...d.data() }))
    },
    staleTime: 30_000,
  })

  // Money leaves the chosen account the moment you lend it out.
  const addMutation = useMutation({
    mutationFn: async (data) => {
      const docRef = await addLending(data)
      if (data.accountId && Number(data.amountLent)) {
        await adjustAccountBalance(data.accountId, -Number(data.amountLent), {
          reason: `Lent to ${data.borrowerName || 'someone'}`, sourceType: 'lending', sourceId: docRef.id,
        })
      }
    },
    onSuccess: refresh,
  })

  // Reconcile the account when the amount or the linked account changes.
  const updateMutation = useMutation({
    mutationFn: async ({ id, data, prev }) => {
      await updateLending(id, data)
      const oldAcc = prev?.accountId || '', oldAmt = Number(prev?.amountLent) || 0
      const newAcc = data.accountId || '', newAmt = Number(data.amountLent) || 0
      if (oldAcc === newAcc) {
        if (oldAcc && oldAmt !== newAmt) {
          // was posted as -oldAmt; should be -newAmt → credit the difference
          await adjustAccountBalance(newAcc, oldAmt - newAmt, { reason: 'Lending updated', sourceType: 'lending', sourceId: id })
        }
      } else {
        if (oldAcc && oldAmt) await adjustAccountBalance(oldAcc, oldAmt, { reason: 'Lending re-linked', sourceType: 'lending', sourceId: id })
        if (newAcc && newAmt) await adjustAccountBalance(newAcc, -newAmt, { reason: 'Lending re-linked', sourceType: 'lending', sourceId: id })
      }
    },
    onSuccess: refresh,
  })

  // Deleting reverses every posting this record made — the principal on its
  // funding account, and each repayment on the account it actually landed in
  // (which may differ now that repayments choose their own account).
  const deleteMutation = useMutation({
    mutationFn: async (lending) => {
      if (lending?.accountId && Number(lending.amountLent)) {
        await adjustAccountBalance(lending.accountId, Number(lending.amountLent), {
          reason: `Lending to ${lending.borrowerName || 'someone'} removed`, sourceType: 'lending', sourceId: lending.id,
        })
      }
      const snap = await listRepayments(lending.id)
      for (const d of snap.docs) {
        const r = d.data()
        if (r.accountId && Number(r.amount)) {
          await adjustAccountBalance(r.accountId, -Number(r.amount), {
            reason: 'Repayment reversed (lending removed)', sourceType: 'lending_repayment', sourceId: lending.id,
          })
        }
      }
      await deleteLending(lending.id)
    },
    onSuccess: refresh,
  })

  const totalLentOut = lendings
    .filter(l => l.status !== 'settled')
    .reduce((s, l) => s + (l.balanceRemaining || 0), 0)

  return { lendings, isLoading, addMutation, updateMutation, deleteMutation, totalLentOut }
}

export function useRepayments(lendingId) {
  const qc = useQueryClient()

  const { data: repayments = [], isLoading } = useQuery({
    queryKey: ['repayments', lendingId],
    queryFn: async () => {
      const snap = await listRepayments(lendingId)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    enabled: !!lendingId,
  })

  const recomputeTotal = async () => {
    const snap = await listRepayments(lendingId)
    const totalRepaid = snap.docs.reduce((s, d) => s + (d.data().amount || 0), 0)
    await updateLending(lendingId, { totalRepaid })
  }

  // A repayment received credits the linked account.
  const addMutation = useMutation({
    mutationFn: async (data) => {
      await addRepayment(lendingId, data)
      await recomputeTotal()
      if (data.accountId && Number(data.amount)) {
        await adjustAccountBalance(data.accountId, Number(data.amount), {
          reason: 'Loan repayment received', sourceType: 'lending_repayment', sourceId: lendingId,
        })
      }
      qc.invalidateQueries({ queryKey: ['lending'] })
      qc.invalidateQueries({ queryKey: ['bank_accounts'] })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repayments', lendingId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (repaymentId) => {
      const r = repayments.find(x => x.id === repaymentId)
      await deleteRepayment(lendingId, repaymentId)
      await recomputeTotal()
      if (r?.accountId && Number(r.amount)) {
        await adjustAccountBalance(r.accountId, -Number(r.amount), {
          reason: 'Loan repayment reversed', sourceType: 'lending_repayment', sourceId: lendingId,
        })
      }
      qc.invalidateQueries({ queryKey: ['lending'] })
      qc.invalidateQueries({ queryKey: ['bank_accounts'] })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repayments', lendingId] }),
  })

  return { repayments, isLoading, addMutation, deleteMutation }
}
