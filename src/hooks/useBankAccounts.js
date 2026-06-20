import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import {
  addBankAccount, updateBankAccount, deleteBankAccount,
  addBalanceHistory, getBalanceHistory,
} from '@/services/firestore'

export function useBankAccounts() {
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'bank_accounts'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setIsLoading(false)
    }, err => {
      console.error('bank_accounts listener:', err)
      setIsLoading(false)
    })
    return unsub
  }, [])

  const addMutation = useMutation({ mutationFn: addBankAccount })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, logHistory }) => {
      if (logHistory) {
        const account = accounts.find(a => a.id === id)
        if (account && account.balance !== data.balance) {
          await addBalanceHistory({
            accountId: id,
            accountName: account.bankName,
            oldBalance: account.balance,
            newBalance: data.balance,
            date: new Date().toISOString(),
          })
        }
      }
      return updateBankAccount(id, data)
    },
  })

  const deleteMutation = useMutation({ mutationFn: deleteBankAccount })

  const totalBalance = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)

  return { accounts, isLoading, addMutation, updateMutation, deleteMutation, totalBalance }
}

export function useBalanceHistory(accountId) {
  return useQuery({
    queryKey: ['balance_history', accountId],
    queryFn: async () => {
      const snap = await getBalanceHistory(accountId)
      const ts = (h) => h.updatedAt?.toMillis?.() ?? (h.date ? Date.parse(h.date) : 0)
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => ts(b) - ts(a))
    },
    enabled: !!accountId,
  })
}
