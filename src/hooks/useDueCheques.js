import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { collectionGroup, query, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { updateOwnedCheque, updateRentedCheque } from '@/services/firestore'
import { useOwnedProperties, useRentedProperties } from '@/hooks/useProperties'
import { useApp } from '@/context/AppContext'
import { normCurrency } from '@/utils/currencies'
import { reconcileChequePosting } from '@/utils/chequePosting'
import { daysUntil } from '@/utils/dateHelpers'

export function useDueCheques() {
  const [all, setAll] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const { activeCurrency } = useApp()
  const { properties: owned } = useOwnedProperties()
  const { properties: rented } = useRentedProperties()

  useEffect(() => {
    const q = query(collectionGroup(db, 'cheques'))
    const unsub = onSnapshot(q, snap => {
      setAll(snap.docs.map(d => {
        const propDoc = d.ref.parent.parent
        const collectionId = propDoc.parent.id
        return { id: d.id, propId: propDoc.id, incoming: collectionId === 'property_owned', ...d.data() }
      }))
      setIsLoading(false)
    }, err => { console.error('cheques collectionGroup listener:', err); setIsLoading(false) })
    return unsub
  }, [])

  const propFor = (c) => (c.incoming ? owned : rented).find(x => x.id === c.propId)
  const nameFor = (p) => {
    if (!p) return 'Property'
    return [p.buildingName, p.roomNumber].filter(Boolean).join(' · ') || 'Property'
  }

  const dueCheques = all
    .filter(c => c.status === 'pending' && c.dueDate && (daysUntil(c.dueDate) ?? 99) <= 0)
    .map(c => {
      const p = propFor(c)
      return { ...c, propertyName: nameFor(p), currency: normCurrency(p?.currency) }
    })
    .filter(c => c.currency === activeCurrency)
    .sort((a, b) => (daysUntil(a.dueDate) ?? 0) - (daysUntil(b.dueDate) ?? 0))

  const actMutation = useMutation({
    mutationFn: async ({ cheque, status }) => {
      const next = { ...cheque, status }
      const label = `Rent cheque #${cheque.chequeNumber || ''}`.trim()
      const posted = await reconcileChequePosting({ prev: cheque, next, incoming: cheque.incoming, sourceId: cheque.id, label })
      const update = cheque.incoming ? updateOwnedCheque : updateRentedCheque
      await update(cheque.propId, cheque.id, { status, ...posted })
    },
  })

  return { dueCheques, isLoading, actMutation }
}
