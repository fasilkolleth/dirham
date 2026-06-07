import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount,
  addBalanceHistory, getBalanceHistory
} from '@/services/firestore'

export function useBankAccounts() {
  const qc = useQueryClient()

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['bank_accounts'],
    queryFn: async () => {
      const snap = await listBankAccounts()
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    staleTime: 30_000,
  })

  const addMutation = useMutation({
    mutationFn: addBankAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank_accounts'] }),
  })

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank_accounts'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBankAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank_accounts'] }),
  })

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
        .sort((a, b) => ts(b) - ts(a)) // newest first
    },
    enabled: !!accountId,
  })
}
