import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listOwnedProperties, addOwnedProperty, updateOwnedProperty, deleteOwnedProperty,
  listOwnedCheques, addOwnedCheque, updateOwnedCheque, deleteOwnedCheque,
  listMaintenanceFees, addMaintenanceFee, updateMaintenanceFee, deleteMaintenanceFee,
  listTenantHistory, addTenantHistory, updateTenantHistory, deleteTenantHistory,
  listRentedProperties, addRentedProperty, updateRentedProperty, deleteRentedProperty,
  listRentedCheques, addRentedCheque, updateRentedCheque, deleteRentedCheque,
} from '@/services/firestore'

export function useOwnedProperties() {
  const qc = useQueryClient()
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['owned_properties'],
    queryFn: async () => {
      const snap = await listOwnedProperties()
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    staleTime: 30_000,
  })
  const addMutation = useMutation({ mutationFn: addOwnedProperty, onSuccess: () => qc.invalidateQueries({ queryKey: ['owned_properties'] }) })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateOwnedProperty(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['owned_properties'] }) })
  const deleteMutation = useMutation({ mutationFn: deleteOwnedProperty, onSuccess: () => qc.invalidateQueries({ queryKey: ['owned_properties'] }) })
  return { properties, isLoading, addMutation, updateMutation, deleteMutation }
}

export function useOwnedCheques(propId) {
  const qc = useQueryClient()
  const { data: cheques = [], isLoading } = useQuery({
    queryKey: ['owned_cheques', propId],
    queryFn: async () => {
      const snap = await listOwnedCheques(propId)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    enabled: !!propId,
  })
  const addMutation = useMutation({ mutationFn: (data) => addOwnedCheque(propId, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['owned_cheques', propId] }) })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateOwnedCheque(propId, id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['owned_cheques', propId] }) })
  const deleteMutation = useMutation({ mutationFn: (id) => deleteOwnedCheque(propId, id), onSuccess: () => qc.invalidateQueries({ queryKey: ['owned_cheques', propId] }) })
  return { cheques, isLoading, addMutation, updateMutation, deleteMutation }
}

export function useMaintenanceFees(propId) {
  const qc = useQueryClient()
  const { data: fees = [], isLoading } = useQuery({
    queryKey: ['maintenance_fees', propId],
    queryFn: async () => {
      const snap = await listMaintenanceFees(propId)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    enabled: !!propId,
  })
  const addMutation = useMutation({ mutationFn: (data) => addMaintenanceFee(propId, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance_fees', propId] }) })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateMaintenanceFee(propId, id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance_fees', propId] }) })
  const deleteMutation = useMutation({ mutationFn: (id) => deleteMaintenanceFee(propId, id), onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance_fees', propId] }) })
  return { fees, isLoading, addMutation, updateMutation, deleteMutation }
}

export function useTenantHistory(propId) {
  const qc = useQueryClient()
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['tenant_history', propId],
    queryFn: async () => {
      const snap = await listTenantHistory(propId)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    enabled: !!propId,
  })
  const addMutation = useMutation({
    mutationFn: (data) => addTenantHistory(propId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant_history', propId] }),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateTenantHistory(propId, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant_history', propId] }),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteTenantHistory(propId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant_history', propId] }),
  })
  return { history, isLoading, addMutation, updateMutation, deleteMutation }
}

export function useRentedProperties() {
  const qc = useQueryClient()
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['rented_properties'],
    queryFn: async () => {
      const snap = await listRentedProperties()
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    staleTime: 30_000,
  })
  const addMutation = useMutation({ mutationFn: addRentedProperty, onSuccess: () => qc.invalidateQueries({ queryKey: ['rented_properties'] }) })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateRentedProperty(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['rented_properties'] }) })
  const deleteMutation = useMutation({ mutationFn: deleteRentedProperty, onSuccess: () => qc.invalidateQueries({ queryKey: ['rented_properties'] }) })
  return { properties, isLoading, addMutation, updateMutation, deleteMutation }
}

export function useRentedCheques(propId) {
  const qc = useQueryClient()
  const { data: cheques = [], isLoading } = useQuery({
    queryKey: ['rented_cheques', propId],
    queryFn: async () => {
      const snap = await listRentedCheques(propId)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    enabled: !!propId,
  })
  const addMutation = useMutation({ mutationFn: (data) => addRentedCheque(propId, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['rented_cheques', propId] }) })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateRentedCheque(propId, id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['rented_cheques', propId] }) })
  const deleteMutation = useMutation({ mutationFn: (id) => deleteRentedCheque(propId, id), onSuccess: () => qc.invalidateQueries({ queryKey: ['rented_cheques', propId] }) })
  return { cheques, isLoading, addMutation, updateMutation, deleteMutation }
}
