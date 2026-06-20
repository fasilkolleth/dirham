import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import {
  addBorrowing, updateBorrowing, deleteBorrowing,
  listBorrowRepayments, addBorrowRepayment, deleteBorrowRepayment, adjustAccountBalance,
} from '@/services/firestore'

const enrichBorrowing = (borrowing) => {
  const totalRepaid = borrowing.totalRepaid || 0
  const balanceRemaining = Math.max(0, (borrowing.amountBorrowed || 0) - totalRepaid)
  const status = balanceRemaining === 0 ? 'settled' : totalRepaid > 0 ? 'partially_repaid' : 'active'
  return { ...borrowing, balanceRemaining, status }
}

export function useBorrowing() {
  const [borrowings, setBorrowings] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'borrowing'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setBorrowings(snap.docs.map(d => enrichBorrowing({ id: d.id, ...d.data() })))
      setIsLoading(false)
    }, err => {
      console.error('borrowing listener:', err)
      setIsLoading(false)
    })
    return unsub
  }, [])

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
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, prev }) => {
      await updateBorrowing(id, data)
      const oldAcc = prev?.accountId || '', oldAmt = Number(prev?.amountBorrowed) || 0
      const newAcc = data.accountId || '', newAmt = Number(data.amountBorrowed) || 0
      if (oldAcc === newAcc) {
        if (oldAcc && oldAmt !== newAmt) {
          await adjustAccountBalance(newAcc, newAmt - oldAmt, { reason: 'Borrowing updated', sourceType: 'borrowing', sourceId: id })
        }
      } else {
        if (oldAcc && oldAmt) await adjustAccountBalance(oldAcc, -oldAmt, { reason: 'Borrowing re-linked', sourceType: 'borrowing', sourceId: id })
        if (newAcc && newAmt) await adjustAccountBalance(newAcc, newAmt, { reason: 'Borrowing re-linked', sourceType: 'borrowing', sourceId: id })
      }
    },
  })

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
  })

  const totalOwed = borrowings
    .filter(b => b.status !== 'settled')
    .reduce((s, b) => s + (b.balanceRemaining || 0), 0)

  return { borrowings, isLoading, addMutation, updateMutation, deleteMutation, totalOwed }
}

export function useBorrowRepayments(borrowingId) {
  const [repayments, setRepayments] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!borrowingId) { setIsLoading(false); return }
    const q = query(collection(db, 'borrowing', borrowingId, 'repayments'), orderBy('date', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setRepayments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setIsLoading(false)
    }, err => { console.error('borrow_repayments listener:', err); setIsLoading(false) })
    return unsub
  }, [borrowingId])

  const recomputeTotal = async () => {
    const snap = await listBorrowRepayments(borrowingId)
    const totalRepaid = snap.docs.reduce((s, d) => s + (d.data().amount || 0), 0)
    await updateBorrowing(borrowingId, { totalRepaid })
  }

  const addMutation = useMutation({
    mutationFn: async (data) => {
      await addBorrowRepayment(borrowingId, data)
      await recomputeTotal()
      if (data.accountId && Number(data.amount)) {
        await adjustAccountBalance(data.accountId, -Number(data.amount), {
          reason: 'Loan repayment paid', sourceType: 'borrow_repayment', sourceId: borrowingId,
        })
      }
    },
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
    },
  })

  return { repayments, isLoading, addMutation, deleteMutation }
}
