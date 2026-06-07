import { useState } from 'react'
import { getBankBrand } from '@/utils/bankBrand'
import { cn } from '@/utils/cn'

// A bank badge: real logo image if one is configured (and loads), otherwise a
// brand-coloured monogram of the bank's initials.
export function BankLogo({ name, size = 36, className }) {
  const brand = getBankBrand(name)
  const [imgFailed, setImgFailed] = useState(false)
  const short = brand.short || 'BK'
  const fontSize = Math.round(size * (short.length >= 4 ? 0.26 : short.length === 3 ? 0.32 : 0.42))

  if (brand.logo && !imgFailed) {
    return (
      <img
        src={brand.logo}
        alt={name}
        title={name}
        onError={() => setImgFailed(true)}
        className={cn('rounded-[var(--radius-md)] object-contain bg-white shrink-0', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      title={name}
      className={cn(
        'rounded-[var(--radius-md)] flex items-center justify-center shrink-0 font-bold tracking-tight leading-none',
        brand.bg ? 'text-white' : 'bg-[var(--surface-2)] text-[var(--accent-text)]',
        className
      )}
      style={{ width: size, height: size, fontSize, ...(brand.bg ? { backgroundColor: brand.bg } : {}) }}
    >
      {short}
    </div>
  )
}
