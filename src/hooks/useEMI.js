import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { addEMI, updateEMI, deleteEMI } from '@/services/firestore'
import { monthsRemaining, monthsElapsed, daysUntil } from '@/utils/dateHelpers'

const enrichEMI = (emi) => {
  const remaining = monthsRemaining(emi.endDate)
  const daysLeft = daysUntil(emi.endDate)
  const elapsed = monthsElapsed(emi.startDate)
  const monthlyAmt = emi.monthlyAmount || 0
  const totalPaid = elapsed * monthlyAmt
  const totalAmt = emi.totalAmount || 0
  const amountRemaining = Math.max(0, totalAmt - totalPaid)
  const status = (daysLeft === null || daysLeft < 0) ? 'closed'
    : remaining <= 3 ? 'ending_soon'
    : 'active'
  return { ...emi, monthsRemaining: remaining, daysRemaining: daysLeft, totalPaid, amountRemaining, status }
}

export function useEMI() {
  const [emis, setEmis] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'emi_tracker'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setEmis(snap.docs.map(d => enrichEMI({ id: d.id, ...d.data() })))
      setIsLoading(false)
    }, err => {
      console.error('emi_tracker listener:', err)
      setIsLoading(false)
    })
    return unsub
  }, [])

  const addMutation = useMutation({ mutationFn: addEMI })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateEMI(id, data) })
  const deleteMutation = useMutation({ mutationFn: deleteEMI })

  const activeEMIs = emis.filter(e => e.status !== 'closed')
  const totalMonthlyEMI = activeEMIs.reduce((s, e) => s + (e.monthlyAmount || 0), 0)

  return { emis, isLoading, addMutation, updateMutation, deleteMutation, activeEMIs, totalMonthlyEMI }
}
