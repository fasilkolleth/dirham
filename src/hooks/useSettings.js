import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveSettings } from '@/services/firestore'
import { useApp } from '@/context/AppContext'

export function useSettings() {
  const { settings, setSettings, loadSettings } = useApp()
  const qc = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: (data) => saveSettings(data),
    onSuccess: (_, data) => {
      setSettings(prev => ({ ...prev, ...data }))
    },
  })

  return { settings, saveMutation, reload: loadSettings }
}
