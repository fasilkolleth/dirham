import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import {
  addLending, updateLending, deleteLending,
  listRepayments, addRepayment, deleteRepayment, adjustAccountBalance,
} from '@/services/firestore'

const enrichLending = (lending) => {
  const totalRepaid = lending.totalRepaid || 0
  const balanceRemaining = Math.max(0, (lending.amountLent || 0) - totalRepaid)
  const status = balanceRemaining === 0 ? 'settled' : totalRepaid > 0 ? 'partially_repaid' : 'active'
  return { ...lending, balanceRemaining, status }
}

export function useLending() {
  const [lendings, setLendings] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'lending'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setLendings(snap.docs.map(d => enrichLending({ id: d.id, ...d.data() })))
      setIsLoading(false)
    }, err => {
      console.error('lending listener:', err)
      setIsLoading(false)
    })
    return unsub
  }, [])

  const addMutation = useMutation({
    mutationFn: async (data) => {
      const docRef = await addLending(data)
      if (data.accountId && Number(data.amountLent)) {
        await adjustAccountBalance(data.accountId, -Number(data.amountLent), {
          reason: `Lent to ${data.borrowerName || 'someone'}`, sourceType: 'lending', sourceId: docRef.id,
        })
      }
      return docRef
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, prev }) => {
      await updateLending(id, data)
      const oldAcc = prev?.accountId || '', oldAmt = Number(prev?.amountLent) || 0
      const newAcc = data.accountId || '', newAmt = Number(data.amountLent) || 0
      if (oldAcc === newAcc) {
        if (oldAcc && oldAmt !== newAmt) {
          await adjustAccountBalance(newAcc, oldAmt - newAmt, { reason: 'Lending updated', sourceType: 'lending', sourceId: id })
        }
      } else {
        if (oldAcc && oldAmt) await adjustAccountBalance(oldAcc, oldAmt, { reason: 'Lending re-linked', sourceType: 'lending', sourceId: id })
        if (newAcc && newAmt) await adjustAccountBalance(newAcc, -newAmt, { reason: 'Lending re-linked', sourceType: 'lending', sourceId: id })
      }
    },
  })

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
  })

  const totalLentOut = lendings
    .filter(l => l.status !== 'settled')
    .reduce((s, l) => s + (l.balanceRemaining || 0), 0)

  return { lendings, isLoading, addMutation, updateMutation, deleteMutation, totalLentOut }
}

export function useRepayments(lendingId) {
  const [repayments, setRepayments] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!lendingId) { setIsLoading(false); return }
    const q = query(collection(db, 'lending', lendingId, 'repayments'), orderBy('date', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setRepayments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setIsLoading(false)
    }, err => { console.error('repayments listener:', err); setIsLoading(false) })
    return unsub
  }, [lendingId])

  const recomputeTotal = async () => {
    const snap = await listRepayments(lendingId)
    const totalRepaid = snap.docs.reduce((s, d) => s + (d.data().amount || 0), 0)
    await updateLending(lendingId, { totalRepaid })
  }

  const addMutation = useMutation({
    mutationFn: async (data) => {
      await addRepayment(lendingId, data)
      await recomputeTotal()
      if (data.accountId && Number(data.amount)) {
        await adjustAccountBalance(data.accountId, Number(data.amount), {
          reason: 'Loan repayment received', sourceType: 'lending_repayment', sourceId: lendingId,
        })
      }
    },
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
    },
  })

  return { repayments, isLoading, addMutation, deleteMutation }
}
