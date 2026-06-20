import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listBorrowing, addBorrowing, updateBorrowing, deleteBorrowing,
  listBorrowRepayments, addBorrowRepayment, deleteBorrowRepayment, adjustAccountBalance,
} from '@/services/firestore'

const enrichBorrowing = (borrowing) => {
  const totalRepaid = borrowing.totalRepaid || 0
  const balanceRemaining = Math.max(0, (borrowing.amountBorrowed || 0) - totalRepaid)
  const status = balanceRemaining === 0 ? 'settled' : totalRepaid > 0 ? 'partially_repaid' : 'active'
  return { ...borrowing, balanceRemaining, status }
}

export function useBorrowing() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['borrowing'] })
    qc.invalidateQueries({ queryKey: ['bank_accounts'] })
  }

  const { data: borrowings = [], isLoading } = useQuery({
    queryKey: ['borrowing'],
    queryFn: async () => {
      const snap = await listBorrowing()
      return snap.docs.map(d => enrichBorrowing({ id: d.id, ...d.data() }))
    },
    staleTime: 30_000,
  })

  // Money lands in the chosen account the moment you borrow it.
  const addMutation = useMutation({
    mutationFn: async (data) => {
      const docRef = await addBorrowing(data)
      if (data.accountId && Number(data.amountBorrowed)) {
        await adjustAccountBalance(data.accountId, Number(data.amountBorrowed), {
          reason: `Borrowed from ${data.lenderName || 'someone'}`, sourceType: 'borrowing', sourceId: docRef.id,
        })
      }
      return docRef
    },
    onSuccess: refresh,
  })

  // Reconcile the account when the amount or the linked account changes.
  const updateMutation = useMutation({
    mutationFn: async ({ id, data, prev }) => {
      await updateBorrowing(id, data)
      const oldAcc = prev?.accountId || '', oldAmt = Number(prev?.amountBorrowed) || 0
      const newAcc = data.accountId || '', newAmt = Number(data.amountBorrowed) || 0
      if (oldAcc === newAcc) {
        if (oldAcc && oldAmt !== newAmt) {
          // was credited +oldAmt; should be +newAmt → post the difference
          await adjustAccountBalance(newAcc, newAmt - oldAmt, { reason: 'Borrowing updated', sourceType: 'borrowing', sourceId: id })
        }
      } else {
        if (oldAcc && oldAmt) await adjustAccountBalance(oldAcc, -oldAmt, { reason: 'Borrowing re-linked', sourceType: 'borrowing', sourceId: id })
        if (newAcc && newAmt) await adjustAccountBalance(newAcc, newAmt, { reason: 'Borrowing re-linked', sourceType: 'borrowing', sourceId: id })
      }
    },
    onSuccess: refresh,
  })

  // Deleting reverses every posting: the principal credited on its account, and
  // each repayment debited from the account it was actually paid from.
  const deleteMutation = useMutation({
    mutationFn: async (borrowing) => {
      if (borrowing?.accountId && Number(borrowing.amountBorrowed)) {
        await adjustAccountBalance(borrowing.accountId, -Number(borrowing.amountBorrowed), {
          reason: `Borrowing from ${borrowing.lenderName || 'someone'} removed`, sourceType: 'borrowing', sourceId: borrowing.id,
        })
      }
      const snap = await listBorrowRepayments(borrowing.id)
      for (const d of snap.docs) {
        const r = d.data()
        if (r.accountId && Number(r.amount)) {
          await adjustAccountBalance(r.accountId, Number(r.amount), {
            reason: 'Repayment reversed (borrowing removed)', sourceType: 'borrow_repayment', sourceId: borrowing.id,
          })
        }
      }
      await deleteBorrowing(borrowing.id)
    },
    onSuccess: refresh,
  })

  const totalOwed = borrowings
    .filter(b => b.status !== 'settled')
    .reduce((s, b) => s + (b.balanceRemaining || 0), 0)

  return { borrowings, isLoading, addMutation, updateMutation, deleteMutation, totalOwed }
}

export function useBorrowRepayments(borrowingId) {
  const qc = useQueryClient()

  const { data: repayments = [], isLoading } = useQuery({
    queryKey: ['borrow_repayments', borrowingId],
    queryFn: async () => {
      const snap = await listBorrowRepayments(borrowingId)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    enabled: !!borrowingId,
  })

  const recomputeTotal = async () => {
    const snap = await listBorrowRepayments(borrowingId)
    const totalRepaid = snap.docs.reduce((s, d) => s + (d.data().amount || 0), 0)
    await updateBorrowing(borrowingId, { totalRepaid })
  }

  // A repayment you make goes OUT — debits the chosen account.
  const addMutation = useMutation({
    mutationFn: async (data) => {
      await addBorrowRepayment(borrowingId, data)
      await recomputeTotal()
      if (data.accountId && Number(data.amount)) {
        await adjustAccountBalance(data.accountId, -Number(data.amount), {
          reason: 'Loan repayment paid', sourceType: 'borrow_repayment', sourceId: borrowingId,
        })
      }
      qc.invalidateQueries({ queryKey: ['borrowing'] })
      qc.invalidateQueries({ queryKey: ['bank_accounts'] })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['borrow_repayments', borrowingId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (repaymentId) => {
      const r = repayments.find(x => x.id === repaymentId)
      await deleteBorrowRepayment(borrowingId, repaymentId)
      await recomputeTotal()
      if (r?.accountId && Number(r.amount)) {
        await adjustAccountBalance(r.accountId, Number(r.amount), {
          reason: 'Loan repayment reversed', sourceType: 'borrow_repayment', sourceId: borrowingId,
        })
      }
      qc.invalidateQueries({ queryKey: ['borrowing'] })
      qc.invalidateQueries({ queryKey: ['bank_accounts'] })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['borrow_repayments', borrowingId] }),
  })

  return { repayments, isLoading, addMutation, deleteMutation }
}
