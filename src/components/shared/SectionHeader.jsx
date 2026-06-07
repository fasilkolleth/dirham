import { cn } from '@/utils/cn'

export function SectionHeader({ title, action, className }) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      <h2 className="text-base font-semibold text-black dark:text-white">{title}</h2>
      {action}
    </div>
  )
}
