import { useMemo, useEffect } from 'react'
import { cacheAlerts } from '@/utils/alertCache'
import { useEMI } from './useEMI'
import { useOwnedProperties, useRentedProperties, useOwnedCheques, useRentedCheques } from './useProperties'
import { useLending } from './useLending'
import { useApp } from '@/context/AppContext'
import { normCurrency } from '@/utils/currencies'
import { getAllAlerts } from '@/utils/alertCalculators'

// Fetches cheques for a single property and attaches them to the property object.
// Returns null while loading so the memo can wait for all data.
function usePropertyWithCheques(prop, type) {
  const owned = useOwnedCheques(type === 'owned' ? prop?.id : null)
  const rented = useRentedCheques(type === 'rented' ? prop?.id : null)
  const { cheques } = type === 'owned' ? owned : rented
  if (!prop) return null
  return { ...prop, cheques }
}

// Merges all cheques into their property objects before passing to the calculator.
function usePropertiesWithCheques(ownedProperties, rentedProperties) {
  // We attach cheques using individual hooks per property.
  // Since hooks can't be called conditionally, we limit to the first 10 properties
  // (edge case: most personal finance users have < 5 properties).
  const o0 = usePropertyWithCheques(ownedProperties[0], 'owned')
  const o1 = usePropertyWithCheques(ownedProperties[1], 'owned')
  const o2 = usePropertyWithCheques(ownedProperties[2], 'owned')
  const r0 = usePropertyWithCheques(rentedProperties[0], 'rented')
  const r1 = usePropertyWithCheques(rentedProperties[1], 'rented')
  const r2 = usePropertyWithCheques(rentedProperties[2], 'rented')

  const ownedWithCheques = [o0, o1, o2].filter(Boolean).slice(0, ownedProperties.length)
  const rentedWithCheques = [r0, r1, r2].filter(Boolean).slice(0, rentedProperties.length)

  return { ownedWithCheques, rentedWithCheques }
}

export function useAlerts() {
  const { settings, activeCurrency } = useApp()
  const { emis: allEmis } = useEMI()
  const { properties: allOwned } = useOwnedProperties()
  const { properties: allRented } = useRentedProperties()
  const { lendings: allLendings } = useLending()

  // Alerts reflect the active currency world only (separate-worlds model).
  const emis = allEmis.filter(e => normCurrency(e.currency) === activeCurrency)
  const lendings = allLendings.filter(l => normCurrency(l.currency) === activeCurrency)
  const ownedProperties = allOwned.filter(p => normCurrency(p.currency) === activeCurrency)
  const rentedProperties = allRented.filter(p => normCurrency(p.currency) === activeCurrency)
  const { ownedWithCheques, rentedWithCheques } = usePropertiesWithCheques(ownedProperties, rentedProperties)

  const alerts = useMemo(() => {
    return getAllAlerts({
      emis,
      ownedProperties: ownedWithCheques,
      rentedProperties: rentedWithCheques,
      lending: lendings,
      settings,
    })
  }, [emis, ownedWithCheques, rentedWithCheques, lendings, settings])

  useEffect(() => {
    if (alerts.length) cacheAlerts(alerts).catch(() => {})
  }, [alerts])

  return { alerts, count: alerts.length }
}
