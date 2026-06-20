import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { getBudget, saveBudget, saveBudgetTemplate, adjustAccountBalance } from '@/services/firestore'
import { currentMonthKey } from '@/utils/dateHelpers'
import { useApp } from '@/context/AppContext'
import { DEFAULT_CURRENCY } from '@/utils/currencies'

const budgetDocId = (monthKey, currency) => currency === DEFAULT_CURRENCY ? monthKey : `${monthKey}__${currency}`
const templateDocId = (currency) => currency === DEFAULT_CURRENCY ? 'budget_template' : `budget_template__${currency}`

const reconcileItemPosting = async (it, prev) => {
  const newAcc = it.accountId || ''
  const newActual = Number(it.actual) || 0
  const newSign = it.type === 'income' ? 1 : -1
  const prevAcc = prev?.accountId || ''
  const prevPosted = Number(prev?.postedAmount) || 0
  const prevSign = prev?.type === 'income' ? 1 : -1

  if (prevAcc === newAcc && prevSign === newSign && newAcc) {
    const delta = newActual - prevPosted
    if (delta) await adjustAccountBalance(newAcc, newSign * delta, { reason: it.category || 'Budget item', sourceType: 'budget', sourceId: it.id })
  } else {
    if (prevAcc && prevPosted) await adjustAccountBalance(prevAcc, -prevSign * prevPosted, { reason: `${prev?.category || 'Budget item'} (re-linked)`, sourceType: 'budget', sourceId: it.id })
    if (newAcc && newActual) await adjustAccountBalance(newAcc, newSign * newActual, { reason: it.category || 'Budget item', sourceType: 'budget', sourceId: it.id })
  }
  return newAcc ? newActual : 0
}

export function useBudget(monthKey = currentMonthKey()) {
  const { activeCurrency } = useApp()
  const docId = budgetDocId(monthKey, activeCurrency)
  const tmplId = templateDocId(activeCurrency)

  const [budget, setBudget] = useState(null)
  const [template, setTemplate] = useState({ items: [] })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'budgets', docId), snap => {
      setBudget(snap.exists() ? { id: docId, ...snap.data() } : null)
      setIsLoading(false)
    }, err => { console.error('budget listener:', err); setIsLoading(false) })
    return unsub
  }, [docId])

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', tmplId), snap => {
      setTemplate(snap.exists() ? snap.data() : { items: [] })
    }, err => console.error('budget_template listener:', err))
    return unsub
  }, [tmplId])

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const snap = await getBudget(docId)
      const prevItems = snap.exists() ? (snap.data().items || []) : []
      const prevById = new Map(prevItems.map(i => [i.id, i]))

      const items = (data.items || []).map(i => ({ ...i }))
      const seen = new Set()
      for (const it of items) {
        seen.add(it.id)
        it.postedAmount = await reconcileItemPosting(it, prevById.get(it.id))
      }
      for (const prev of prevItems) {
        if (seen.has(prev.id)) continue
        const prevPosted = Number(prev.postedAmount) || 0
        const prevSign = prev.type === 'income' ? 1 : -1
        if (prev.accountId && prevPosted) {
          await adjustAccountBalance(prev.accountId, -prevSign * prevPosted, { reason: `${prev.category || 'Budget item'} (removed)`, sourceType: 'budget', sourceId: prev.id })
        }
      }

      return saveBudget(docId, { ...data, items })
    },
  })

  const saveTemplateMutation = useMutation({
    mutationFn: (data) => saveBudgetTemplate(tmplId, data),
  })

  const initFromTemplate = async () => {
    if (!template?.items?.length) return { added: 0, skipped: 0 }

    const existingCategories = new Set(
      (budget?.items || []).map(i => i.category.toLowerCase().trim())
    )

    const toAdd = template.items.filter(
      t => !existingCategories.has(t.category.toLowerCase().trim())
    )
    const skipped = template.items.length - toAdd.length

    if (toAdd.length === 0) return { added: 0, skipped }

    const merged = [
      ...(budget?.items || []),
      ...toAdd.map(item => ({ ...item, actual: 0, id: crypto.randomUUID() })),
    ]

    await saveMutation.mutateAsync({
      items: merged,
      month: monthKey,
      createdAt: new Date().toISOString(),
    })

    return { added: toAdd.length, skipped }
  }

  return { budget, isLoading, template, saveMutation, saveTemplateMutation, initFromTemplate }
}
