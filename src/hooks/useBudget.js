import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBudget, saveBudget, getBudgetTemplate, saveBudgetTemplate, adjustAccountBalance } from '@/services/firestore'
import { currentMonthKey } from '@/utils/dateHelpers'
import { useApp } from '@/context/AppContext'
import { DEFAULT_CURRENCY } from '@/utils/currencies'

// Per-currency doc ids. AED keeps the original keys (no migration); other
// currencies get a suffixed doc so each currency has its own budget & template.
const budgetDocId = (monthKey, currency) => currency === DEFAULT_CURRENCY ? monthKey : `${monthKey}__${currency}`
const templateDocId = (currency) => currency === DEFAULT_CURRENCY ? 'budget_template' : `budget_template__${currency}`

// Post a budget item's actual to its linked account, reconciling against what was
// already posted (postedAmount). Income credits, expense debits. Returns the new
// postedAmount to store on the item. Centralized so every save path stays correct.
const reconcileItemPosting = async (it, prev) => {
  const newAcc = it.accountId || ''
  const newActual = Number(it.actual) || 0
  const newSign = it.type === 'income' ? 1 : -1
  const prevAcc = prev?.accountId || ''
  const prevPosted = Number(prev?.postedAmount) || 0
  const prevSign = prev?.type === 'income' ? 1 : -1

  if (prevAcc === newAcc && prevSign === newSign && newAcc) {
    const delta = newActual - prevPosted // same account & direction → post only the change
    if (delta) await adjustAccountBalance(newAcc, newSign * delta, { reason: it.category || 'Budget item', sourceType: 'budget', sourceId: it.id })
  } else {
    if (prevAcc && prevPosted) await adjustAccountBalance(prevAcc, -prevSign * prevPosted, { reason: `${prev?.category || 'Budget item'} (re-linked)`, sourceType: 'budget', sourceId: it.id })
    if (newAcc && newActual) await adjustAccountBalance(newAcc, newSign * newActual, { reason: it.category || 'Budget item', sourceType: 'budget', sourceId: it.id })
  }
  return newAcc ? newActual : 0
}

export function useBudget(monthKey = currentMonthKey()) {
  const qc = useQueryClient()
  const { activeCurrency } = useApp()
  const docId = budgetDocId(monthKey, activeCurrency)
  const tmplId = templateDocId(activeCurrency)

  const { data: budget, isLoading } = useQuery({
    queryKey: ['budget', monthKey, activeCurrency],
    queryFn: async () => {
      const snap = await getBudget(docId)
      return snap.exists() ? { id: docId, ...snap.data() } : null
    },
    staleTime: 30_000,
  })

  const { data: template } = useQuery({
    queryKey: ['budget_template', activeCurrency],
    queryFn: async () => {
      const snap = await getBudgetTemplate(tmplId)
      return snap.exists() ? snap.data() : { items: [] }
    },
    staleTime: 60_000,
  })

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Read the committed previous state so deltas can't drift on rapid edits.
      const snap = await getBudget(docId)
      const prevItems = snap.exists() ? (snap.data().items || []) : []
      const prevById = new Map(prevItems.map(i => [i.id, i]))

      const items = (data.items || []).map(i => ({ ...i }))
      const seen = new Set()
      for (const it of items) {
        seen.add(it.id)
        it.postedAmount = await reconcileItemPosting(it, prevById.get(it.id))
      }
      // Items removed this save → reverse their postings.
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget', monthKey, activeCurrency] })
      qc.invalidateQueries({ queryKey: ['bank_accounts'] })
    },
  })

  const saveTemplateMutation = useMutation({
    mutationFn: (data) => saveBudgetTemplate(tmplId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget_template', activeCurrency] }),
  })

  // Smart merge: only add template items whose category doesn't already exist this month
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
