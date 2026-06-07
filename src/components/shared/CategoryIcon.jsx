import { createElement } from 'react'
import { getCategoryIcon } from '@/utils/categoryIcon'
import { cn } from '@/utils/cn'

// Small icon chip for a budget category. The icon shape comes from the category
// name; its color carries the type (green = income, neutral = expense).
export function CategoryIcon({ name, type = 'expense', className }) {
  const icon = getCategoryIcon(name, type)
  return (
    <span className={cn('w-6 h-6 rounded-[var(--radius-md)] bg-[var(--surface-3)] flex items-center justify-center shrink-0', className)}>
      {createElement(icon, { size: 13, className: type === 'income' ? 'text-[var(--success)]' : 'text-[var(--text-2)]' })}
    </span>
  )
}
