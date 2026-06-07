import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listEMIs, addEMI, updateEMI, deleteEMI } from '@/services/firestore'
import { monthsRemaining, monthsElapsed, daysUntil } from '@/utils/dateHelpers'

const enrichEMI = (emi) => {
  const remaining = monthsRemaining(emi.endDate)
  const daysLeft = daysUntil(emi.endDate)
  const elapsed = monthsElapsed(emi.startDate)
  const monthlyAmt = emi.monthlyAmount || 0
  const totalPaid = elapsed * monthlyAmt
  const totalAmt = emi.totalAmount || 0
  const amountRemaining = Math.max(0, totalAmt - totalPaid)
  // 'closed' only when the end date has actually passed (negative days),
  // NOT when < 1 calendar month remains — that was hiding urgent near-end EMIs
  const status = (daysLeft === null || daysLeft < 0) ? 'closed'
    : remaining <= 3 ? 'ending_soon'
    : 'active'
  return { ...emi, monthsRemaining: remaining, daysRemaining: daysLeft, totalPaid, amountRemaining, status }
}

export function useEMI() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['emis'] })

  const { data: emis = [], isLoading } = useQuery({
    queryKey: ['emis'],
    queryFn: async () => {
      const snap = await listEMIs()
      return snap.docs.map(d => enrichEMI({ id: d.id, ...d.data() }))
    },
    staleTime: 30_000,
  })

  const addMutation = useMutation({
    mutationFn: addEMI,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateEMI(id, data),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEMI,
    onSuccess: invalidate,
  })

  const activeEMIs = emis.filter(e => e.status !== 'closed')
  const totalMonthlyEMI = activeEMIs.reduce((s, e) => s + (e.monthlyAmount || 0), 0)

  return { emis, isLoading, addMutation, updateMutation, deleteMutation, activeEMIs, totalMonthlyEMI }
}
