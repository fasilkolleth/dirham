import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { addTransfer, deleteTransfer, adjustAccountBalance } from '@/services/firestore'

export function useTransfers() {
  const [transfers, setTransfers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'transfers'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setTransfers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setIsLoading(false)
    }, err => { console.error('transfers listener:', err); setIsLoading(false) })
    return unsub
  }, [])

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
  })

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
  })

  return { transfers, isLoading, addMutation, deleteMutation }
}
