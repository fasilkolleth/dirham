import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { collection, collectionGroup, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import {
  addOwnedProperty, updateOwnedProperty, deleteOwnedProperty,
  addOwnedCheque, updateOwnedCheque, deleteOwnedCheque,
  addMaintenanceFee, updateMaintenanceFee, deleteMaintenanceFee,
  addTenantHistory, updateTenantHistory, deleteTenantHistory,
  addRentedProperty, updateRentedProperty, deleteRentedProperty,
  addRentedCheque, updateRentedCheque, deleteRentedCheque,
} from '@/services/firestore'

function useCollection(col, ...queryConstraints) {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    const q = query(col, ...queryConstraints)
    const unsub = onSnapshot(q, snap => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setIsLoading(false)
    }, err => { console.error('onSnapshot:', err); setIsLoading(false) })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return [data, isLoading]
}

function useSubCollection(path, enabled, ...constraints) {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(!enabled)
  useEffect(() => {
    if (!enabled) { setIsLoading(false); return }
    const q = query(collection(db, ...path), ...constraints)
    const unsub = onSnapshot(q, snap => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setIsLoading(false)
    }, err => { console.error('onSnapshot sub:', err); setIsLoading(false) })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...path])
  return [data, isLoading]
}

export function useOwnedProperties() {
  const [properties, isLoading] = useCollection(collection(db, 'property_owned'), orderBy('createdAt', 'desc'))
  const addMutation = useMutation({ mutationFn: addOwnedProperty })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateOwnedProperty(id, data) })
  const deleteMutation = useMutation({ mutationFn: deleteOwnedProperty })
  return { properties, isLoading, addMutation, updateMutation, deleteMutation }
}

export function useOwnedCheques(propId) {
  const [cheques, isLoading] = useSubCollection(['property_owned', propId, 'cheques'], !!propId, orderBy('dueDate', 'asc'))
  const addMutation = useMutation({ mutationFn: (data) => addOwnedCheque(propId, data) })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateOwnedCheque(propId, id, data) })
  const deleteMutation = useMutation({ mutationFn: (id) => deleteOwnedCheque(propId, id) })
  return { cheques, isLoading, addMutation, updateMutation, deleteMutation }
}

export function useMaintenanceFees(propId) {
  const [fees, isLoading] = useSubCollection(['property_owned', propId, 'maintenance_fees'], !!propId, orderBy('year', 'desc'))
  const addMutation = useMutation({ mutationFn: (data) => addMaintenanceFee(propId, data) })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateMaintenanceFee(propId, id, data) })
  const deleteMutation = useMutation({ mutationFn: (id) => deleteMaintenanceFee(propId, id) })
  return { fees, isLoading, addMutation, updateMutation, deleteMutation }
}

export function useTenantHistory(propId) {
  const [history, isLoading] = useSubCollection(['property_owned', propId, 'tenant_history'], !!propId, orderBy('contractEndDate', 'desc'))
  const addMutation = useMutation({ mutationFn: (data) => addTenantHistory(propId, data) })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateTenantHistory(propId, id, data) })
  const deleteMutation = useMutation({ mutationFn: (id) => deleteTenantHistory(propId, id) })
  return { history, isLoading, addMutation, updateMutation, deleteMutation }
}

export function useRentedProperties() {
  const [properties, isLoading] = useCollection(collection(db, 'property_rented'), orderBy('createdAt', 'desc'))
  const addMutation = useMutation({ mutationFn: addRentedProperty })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateRentedProperty(id, data) })
  const deleteMutation = useMutation({ mutationFn: deleteRentedProperty })
  return { properties, isLoading, addMutation, updateMutation, deleteMutation }
}

export function useRentedCheques(propId) {
  const [cheques, isLoading] = useSubCollection(['property_rented', propId, 'cheques'], !!propId, orderBy('dueDate', 'asc'))
  const addMutation = useMutation({ mutationFn: (data) => addRentedCheque(propId, data) })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateRentedCheque(propId, id, data) })
  const deleteMutation = useMutation({ mutationFn: (id) => deleteRentedCheque(propId, id) })
  return { cheques, isLoading, addMutation, updateMutation, deleteMutation }
}
