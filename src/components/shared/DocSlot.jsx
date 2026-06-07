import { FileText, Upload, ExternalLink, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'

const ACCEPT = '.pdf,.jpg,.jpeg,.png'

/**
 * A single document slot for property files (contract, cheque, etc).
 * - No file yet  → dashed "Upload {label}" button.
 * - File present → View link + Replace + Delete actions.
 *
 * Parent owns persistence: `onPick(file)` uploads & saves the URL,
 * `onDelete()` removes the file and clears the stored reference.
 */
export function DocSlot({ url, label, icon: Icon = FileText, busy, onPick, onDelete, compact = false, className }) {
  const h = compact ? 'h-7' : 'h-9'
  const sq = compact ? 'w-7' : 'w-9'
  const iconSize = compact ? 11 : 13

  const handleInput = (e) => {
    const file = e.target.files?.[0]
    if (file) onPick(file)
    e.target.value = '' // allow re-picking the same filename
  }

  if (url) {
    return (
      <div className={cn('flex-1 flex items-stretch gap-1 min-w-0', className)}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--accent-text)] hover:bg-[var(--surface-2)] transition-colors', h)}
        >
          <Icon size={iconSize} /> <span className="truncate">{label}</span> <ExternalLink size={compact ? 10 : 11} />
        </a>
        <button
          type="button"
          title={`Delete ${label}`}
          onClick={onDelete}
          disabled={busy}
          className={cn('flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-3)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors shrink-0', h, sq, busy && 'opacity-50 pointer-events-none')}
        >
          <Trash2 size={iconSize} />
        </button>
      </div>
    )
  }

  return (
    <div className={cn('flex-1 flex items-stretch gap-1 min-w-0', className)}>
      <label
        className={cn('flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] text-xs font-medium text-[var(--accent-text)] cursor-pointer hover:bg-[var(--surface-2)] transition-colors', h, busy && 'opacity-50')}
      >
        <Upload size={compact ? 11 : 12} /> {busy ? 'Uploading…' : `${compact ? '' : 'Upload '}${label}`}
        <input type="file" accept={ACCEPT} className="hidden" onChange={handleInput} disabled={busy} />
      </label>
      {/* Spacer matches the delete button on filled slots so buttons line up */}
      <div className={cn('shrink-0', sq)} aria-hidden="true" />
    </div>
  )
}
