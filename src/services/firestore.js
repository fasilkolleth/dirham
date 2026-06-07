import {
  collection, collectionGroup, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, orderBy, where, onSnapshot,
  serverTimestamp, increment
} from 'firebase/firestore'
import { db } from './firebase'

// ── Helpers ──────────────────────────────────────────────────────────────────
const col = (path) => collection(db, path)
const ref = (path, id) => doc(db, path, id)

// ── Push Notifications ────────────────────────────────────────────────────────
export const saveFcmToken = (token) =>
  setDoc(doc(db, 'config', 'push'), { token, updatedAt: new Date().toISOString() }, { merge: true })

// ── Settings & Templates ──────────────────────────────────────────────────────
export const getSettings = () => getDoc(doc(db, 'config', 'settings'))
export const saveSettings = (data) => setDoc(doc(db, 'config', 'settings'), data, { merge: true })

export const getBudgetTemplate = (docId = 'budget_template') => getDoc(doc(db, 'config', docId))
export const saveBudgetTemplate = (docId, data) => setDoc(doc(db, 'config', docId), data, { merge: true })

// ── Budget ────────────────────────────────────────────────────────────────────
export const getBudget = (monthKey) => getDoc(doc(db, 'budgets', monthKey))
export const saveBudget = (monthKey, data) => setDoc(doc(db, 'budgets', monthKey), data, { merge: true })
export const listBudgets = () => getDocs(query(col('budgets'), orderBy('__name__', 'desc')))

// ── EMI ───────────────────────────────────────────────────────────────────────
export const listEMIs = () => getDocs(query(col('emi_tracker'), orderBy('createdAt', 'desc')))
export const addEMI = (data) => addDoc(col('emi_tracker'), { ...data, createdAt: serverTimestamp() })
export const updateEMI = (id, data) => updateDoc(ref('emi_tracker', id), data)
export const deleteEMI = (id) => deleteDoc(ref('emi_tracker', id))

// ── Bank Accounts ─────────────────────────────────────────────────────────────
export const listBankAccounts = () => getDocs(query(col('bank_accounts'), orderBy('createdAt', 'desc')))
export const addBankAccount = (data) => addDoc(col('bank_accounts'), { ...data, createdAt: serverTimestamp() })
export const updateBankAccount = (id, data) => updateDoc(ref('bank_accounts', id), data)
export const deleteBankAccount = (id) => deleteDoc(ref('bank_accounts', id))

export const addBalanceHistory = (data) => addDoc(col('bank_balance_history'), { ...data, updatedAt: serverTimestamp() })
// No orderBy → only needs the auto-created single-field index (no composite
// index to configure). Caller sorts client-side.
export const getBalanceHistory = (accountId) =>
  getDocs(query(col('bank_balance_history'), where('accountId', '==', accountId)))

// Atomically move money in/out of an account and log it to history.
// delta > 0 credits (money in), delta < 0 debits (money out). No-op without both args.
export const adjustAccountBalance = async (accountId, delta, meta = {}) => {
  if (!accountId || !delta) return
  await updateDoc(ref('bank_accounts', accountId), { balance: increment(delta) })
  await addBalanceHistory({
    accountId,
    delta,
    reason: meta.reason || '',
    sourceType: meta.sourceType || '',
    sourceId: meta.sourceId || '',
    date: new Date().toISOString(),
  })
}

// All cheques across every owned & rented property, in one query. Each doc's
// parent path tells us which property (and whether it's owned vs rented).
export const listAllCheques = () => getDocs(collectionGroup(db, 'cheques'))

// ── Transfers (between own accounts) ──────────────────────────────────────────
export const listTransfers = () => getDocs(query(col('transfers'), orderBy('date', 'desc')))
export const addTransfer = (data) => addDoc(col('transfers'), { ...data, createdAt: serverTimestamp() })
export const deleteTransfer = (id) => deleteDoc(ref('transfers', id))

// ── Properties — Owned ────────────────────────────────────────────────────────
export const listOwnedProperties = () => getDocs(query(col('property_owned'), orderBy('createdAt', 'desc')))
export const addOwnedProperty = (data) => addDoc(col('property_owned'), { ...data, createdAt: serverTimestamp() })
export const updateOwnedProperty = (id, data) => updateDoc(ref('property_owned', id), data)
export const deleteOwnedProperty = (id) => deleteDoc(ref('property_owned', id))

export const listOwnedCheques = (propId) =>
  getDocs(query(collection(db, 'property_owned', propId, 'cheques'), orderBy('dueDate', 'asc')))
export const addOwnedCheque = (propId, data) =>
  addDoc(collection(db, 'property_owned', propId, 'cheques'), data)
export const updateOwnedCheque = (propId, chequeId, data) =>
  updateDoc(doc(db, 'property_owned', propId, 'cheques', chequeId), data)
export const deleteOwnedCheque = (propId, chequeId) =>
  deleteDoc(doc(db, 'property_owned', propId, 'cheques', chequeId))

export const listMaintenanceFees = (propId) =>
  getDocs(query(collection(db, 'property_owned', propId, 'maintenance_fees'), orderBy('year', 'desc')))
export const addMaintenanceFee = (propId, data) =>
  addDoc(collection(db, 'property_owned', propId, 'maintenance_fees'), data)
export const updateMaintenanceFee = (propId, feeId, data) =>
  updateDoc(doc(db, 'property_owned', propId, 'maintenance_fees', feeId), data)
export const deleteMaintenanceFee = (propId, feeId) =>
  deleteDoc(doc(db, 'property_owned', propId, 'maintenance_fees', feeId))

// ── Tenant History ────────────────────────────────────────────────────────────
export const listTenantHistory = (propId) =>
  getDocs(query(collection(db, 'property_owned', propId, 'tenant_history'), orderBy('contractEndDate', 'desc')))
export const addTenantHistory = (propId, data) =>
  addDoc(collection(db, 'property_owned', propId, 'tenant_history'), { ...data, archivedAt: serverTimestamp() })
export const updateTenantHistory = (propId, historyId, data) =>
  updateDoc(doc(db, 'property_owned', propId, 'tenant_history', historyId), data)
export const deleteTenantHistory = (propId, historyId) =>
  deleteDoc(doc(db, 'property_owned', propId, 'tenant_history', historyId))

// ── Properties — Rented ───────────────────────────────────────────────────────
export const listRentedProperties = () => getDocs(query(col('property_rented'), orderBy('createdAt', 'desc')))
export const addRentedProperty = (data) => addDoc(col('property_rented'), { ...data, createdAt: serverTimestamp() })
export const updateRentedProperty = (id, data) => updateDoc(ref('property_rented', id), data)
export const deleteRentedProperty = (id) => deleteDoc(ref('property_rented', id))

export const listRentedCheques = (propId) =>
  getDocs(query(collection(db, 'property_rented', propId, 'cheques'), orderBy('dueDate', 'asc')))
export const addRentedCheque = (propId, data) =>
  addDoc(collection(db, 'property_rented', propId, 'cheques'), data)
export const updateRentedCheque = (propId, chequeId, data) =>
  updateDoc(doc(db, 'property_rented', propId, 'cheques', chequeId), data)
export const deleteRentedCheque = (propId, chequeId) =>
  deleteDoc(doc(db, 'property_rented', propId, 'cheques', chequeId))

// ── Lending ───────────────────────────────────────────────────────────────────
export const listLending = () => getDocs(query(col('lending'), orderBy('createdAt', 'desc')))
export const addLending = (data) => addDoc(col('lending'), { ...data, createdAt: serverTimestamp() })
export const updateLending = (id, data) => updateDoc(ref('lending', id), data)
export const deleteLending = (id) => deleteDoc(ref('lending', id))

export const listRepayments = (lendingId) =>
  getDocs(query(collection(db, 'lending', lendingId, 'repayments'), orderBy('date', 'desc')))
export const addRepayment = (lendingId, data) =>
  addDoc(collection(db, 'lending', lendingId, 'repayments'), { ...data, createdAt: serverTimestamp() })
export const deleteRepayment = (lendingId, repaymentId) =>
  deleteDoc(doc(db, 'lending', lendingId, 'repayments', repaymentId))

// ── Borrowing ─────────────────────────────────────────────────────────────────
export const listBorrowing = () => getDocs(query(col('borrowing'), orderBy('createdAt', 'desc')))
export const addBorrowing = (data) => addDoc(col('borrowing'), { ...data, createdAt: serverTimestamp() })
export const updateBorrowing = (id, data) => updateDoc(ref('borrowing', id), data)
export const deleteBorrowing = (id) => deleteDoc(ref('borrowing', id))

export const listBorrowRepayments = (borrowingId) =>
  getDocs(query(collection(db, 'borrowing', borrowingId, 'repayments'), orderBy('date', 'desc')))
export const addBorrowRepayment = (borrowingId, data) =>
  addDoc(collection(db, 'borrowing', borrowingId, 'repayments'), { ...data, createdAt: serverTimestamp() })
export const deleteBorrowRepayment = (borrowingId, repaymentId) =>
  deleteDoc(doc(db, 'borrowing', borrowingId, 'repayments', repaymentId))

// ── Real-time listeners ───────────────────────────────────────────────────────
export const onBankAccountsChange = (callback) =>
  onSnapshot(query(col('bank_accounts'), orderBy('createdAt', 'desc')), callback)

export const onEMIsChange = (callback) =>
  onSnapshot(query(col('emi_tracker'), orderBy('createdAt', 'desc')), callback)
