export const formatCurrency = (amount, currency = 'AED') => {
  if (amount === null || amount === undefined || isNaN(amount)) return '—'
  const num = Number(amount)
  if (currency === 'AED') {
    return `AED ${num.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (currency === 'INR') {
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num)
}

export const formatCompact = (amount, currency = 'AED') => {
  if (!amount || isNaN(amount)) return '—'
  const num = Number(amount)
  const abs = Math.abs(num)
  let formatted
  if (abs >= 1_000_000) formatted = `${(num / 1_000_000).toFixed(1)}M`
  else if (abs >= 1_000) formatted = `${(num / 1_000).toFixed(1)}K`
  else formatted = num.toFixed(0)
  return currency === 'AED' ? `AED ${formatted}` : `₹${formatted}`
}

export const parseAmount = (str) => {
  const cleaned = String(str).replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}
