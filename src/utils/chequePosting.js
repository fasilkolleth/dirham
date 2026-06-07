import { adjustAccountBalance } from '@/services/firestore'

// Post a cheque to its account when (and only when) it's cleared, reconciling
// against whatever it last posted so edits / re-clears / un-clears stay exact.
//   incoming = true  → owned property: rent received → credits the account
//   incoming = false → rented property: rent paid     → debits the account
// Returns the posted fields to store on the cheque doc.
export async function reconcileChequePosting({ prev, next, incoming, sourceId, label }) {
  const sign = incoming ? 1 : -1
  const sourceType = incoming ? 'owned_cheque' : 'rented_cheque'

  const prevAcc = prev?.postedAccountId || ''
  const prevAmt = Number(prev?.postedAmount) || 0
  const nextAcc = (next.status === 'cleared' && next.accountId) ? next.accountId : ''
  const nextAmt = nextAcc ? (Number(next.amount) || 0) : 0

  if (prevAcc === nextAcc && prevAmt === nextAmt) {
    return { postedAccountId: nextAcc, postedAmount: nextAmt } // nothing changed
  }
  if (prevAcc && prevAmt) {
    await adjustAccountBalance(prevAcc, -sign * prevAmt, { reason: `${label} reversed`, sourceType, sourceId })
  }
  if (nextAcc && nextAmt) {
    await adjustAccountBalance(nextAcc, sign * nextAmt, { reason: label, sourceType, sourceId })
  }
  return { postedAccountId: nextAcc, postedAmount: nextAmt }
}

// Reverse a cheque's posting when it's deleted.
export async function reverseChequePosting({ cheque, incoming, sourceId, label }) {
  const sign = incoming ? 1 : -1
  const sourceType = incoming ? 'owned_cheque' : 'rented_cheque'
  const acc = cheque?.postedAccountId || ''
  const amt = Number(cheque?.postedAmount) || 0
  if (acc && amt) {
    await adjustAccountBalance(acc, -sign * amt, { reason: `${label} removed`, sourceType, sourceId })
  }
}
