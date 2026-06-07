import { daysUntil, monthsRemaining } from './dateHelpers.js'
import { formatCurrency } from './currencyFormatter.js'

export const calcEMIAlerts = (emis = [], warningMonths = 3) => {
  return emis
    .filter(emi => emi.status !== 'closed')
    .map(emi => {
      const months = monthsRemaining(emi.endDate)
      // months >= 0 catches EMIs ending THIS calendar month (months = 0 but not yet past end date)
      if (months <= warningMonths && months >= 0) {
        const desc = months === 0
          ? `Ending this month — ${emi.lender}`
          : `${months} month${months !== 1 ? 's' : ''} remaining — ${emi.lender}`
        return {
          type: 'emi',
          id: emi.id,
          title: `${emi.purpose} EMI ending soon`,
          description: desc,
          severity: months <= 1 ? 'high' : 'medium',
          tone: 'positive', // a loan finishing is good news
          dueDate: emi.endDate,
        }
      }
      return null
    })
    .filter(Boolean)
}

// Monthly EMI payment reminder — mirrors cheque alerts. Looks at each active
// EMI's due day (day-of-month of its start date), finds the next upcoming
// occurrence, and warns when that due date is within `warningDays`.
export const calcEmiDueAlerts = (emis = [], warningDays = 5) => {
  const alerts = []
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const toKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  for (const emi of emis) {
    if (emi.status === 'closed') continue
    const dueDay = emi.startDate ? (new Date(emi.startDate).getDate() || 1) : 1

    // Walk forward to the next not-yet-past due date (this month, else next).
    let y = now.getFullYear(), mo = now.getMonth(), due = null
    for (let i = 0; i < 3; i++) {
      const cand = new Date(y, mo, dueDay)
      if (cand >= startToday) { due = cand; break }
      mo++; if (mo > 11) { mo = 0; y++ }
    }
    if (!due) continue
    if (emi.endDate) {
      const end = new Date(emi.endDate)
      if (!isNaN(end.getTime()) && due > end) continue // loan's over — no more payments
    }

    const days = daysUntil(toKey(due))
    if (days !== null && days >= 0 && days <= warningDays) {
      alerts.push({
        type: 'emi_due',
        id: `emidue-${emi.id}`,
        title: `${emi.purpose} EMI due${days === 0 ? ' today' : ` in ${days} day${days !== 1 ? 's' : ''}`}`,
        description: `${formatCurrency(emi.monthlyAmount, emi.currency)} — ${emi.lender}`,
        severity: days <= 1 ? 'high' : 'medium',
        dueDate: toKey(due),
      })
    }
  }
  return alerts
}

// `tone` lets the caller mark whose cheque it is: 'positive' for an owned
// property (rent coming IN), undefined for a rented one (a payment you owe).
export const calcChequeAlerts = (properties = [], warningDays = 7, tone) => {
  const alerts = []
  for (const prop of properties) {
    const cheques = prop.cheques || []
    for (const cheque of cheques) {
      if (cheque.status === 'cleared' || cheque.status === 'bounced') continue
      const days = daysUntil(cheque.dueDate)
      if (days !== null && days <= warningDays && days >= 0) {
        alerts.push({
          type: 'cheque',
          id: `${prop.id}-${cheque.id}`,
          title: `Cheque due${days === 0 ? ' today' : ` in ${days} day${days !== 1 ? 's' : ''}`}`,
          description: `${prop.buildingName || prop.name} — Cheque #${cheque.chequeNumber} — ${formatCurrency(cheque.amount, prop.currency)}`,
          severity: days <= 1 ? 'high' : 'medium',
          tone,
          dueDate: cheque.dueDate,
        })
      }
    }
  }
  return alerts
}

export const calcContractAlerts = (properties = [], warningDays = 60, label = '') => {
  return properties
    .map(prop => {
      const days = daysUntil(prop.contractEndDate)
      if (days !== null && days <= warningDays && days >= 0) {
        return {
          type: 'contract',
          id: prop.id,
          title: `${label ? label + ' ' : ''}Contract expiring${days === 0 ? ' today' : ` in ${days} days`}`,
          description: `${prop.buildingName || prop.name}${prop.tenantName ? ` — Tenant: ${prop.tenantName}` : ''}`,
          severity: days <= 14 ? 'high' : 'medium',
          dueDate: prop.contractEndDate,
        }
      }
      return null
    })
    .filter(Boolean)
}

export const calcLendingAlerts = (lendings = [], warningDays = 7) => {
  return lendings
    .filter(l => l.status !== 'settled')
    .map(l => {
      const days = daysUntil(l.agreedDueDate)
      if (days !== null && days <= warningDays && days >= 0) {
        return {
          type: 'lending',
          id: l.id,
          title: `Repayment due from ${l.borrowerName}`,
          description: `${formatCurrency(l.balanceRemaining, l.currency)} remaining${days === 0 ? ' — due today' : ` — in ${days} days`}`,
          severity: days <= 1 ? 'high' : 'medium',
          tone: 'positive', // money coming back to you
          dueDate: l.agreedDueDate,
        }
      }
      return null
    })
    .filter(Boolean)
}

export const getAllAlerts = ({ emis, ownedProperties, rentedProperties, lending, settings }) => {
  const {
    emiWarningMonths = 3,
    emiDueWarningDays = 5,
    chequeWarningDays = 7,
    ownedContractWarningDays = 60,
    rentedContractWarningDays = 60,
    lendingWarningDays = 7,
  } = settings || {}

  return [
    ...calcEMIAlerts(emis, emiWarningMonths),
    ...calcEmiDueAlerts(emis, emiDueWarningDays),
    ...calcChequeAlerts(ownedProperties || [], chequeWarningDays, 'positive'), // rent coming in
    ...calcChequeAlerts(rentedProperties || [], chequeWarningDays),            // a payment you owe
    ...calcContractAlerts(ownedProperties || [], ownedContractWarningDays, 'Owned'),
    ...calcContractAlerts(rentedProperties || [], rentedContractWarningDays, 'Rented'),
    ...calcLendingAlerts(lending, lendingWarningDays),
  ].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2)
  })
}
