import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export function Modal({ open, onClose, title, children, className }) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 animate-fade-in" />

        {/* Mobile: slides up from bottom | Desktop: centered dialog */}
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed z-50 flex flex-col',
            'bg-[var(--surface)] border border-[var(--border)]',
            'shadow-[var(--shadow-xl)]',
            /* Mobile */
            'bottom-0 left-0 right-0 rounded-t-[var(--radius-2xl)] animate-slide-up max-h-[92dvh]',
            /* Desktop override */
            'md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
            'md:w-full md:max-w-lg md:rounded-[var(--radius-xl)] md:animate-fade-in md:max-h-[88dvh]',
            className
          )}
        >
          {/* Handle bar — mobile only */}
          <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
            <Dialog.Title className="text-sm font-semibold text-[var(--text-1)]">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-all"
              >
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-5 py-5">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = 'Delete', loading }) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-[calc(100vw-48px)] max-w-sm',
            'bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)]',
            'shadow-[var(--shadow-xl)] animate-fade-in overflow-hidden'
          )}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <div className="px-6 pt-6 pb-5 text-center">
            <p className="text-sm font-semibold text-[var(--text-1)]">{title}</p>
            {description && (
              <p className="text-sm text-[var(--text-2)] mt-2 leading-relaxed">{description}</p>
            )}
          </div>
          <div className="flex border-t border-[var(--border)]">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 text-sm font-medium text-[var(--accent-text)] border-r border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3.5 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors disabled:opacity-40"
            >
              {loading ? 'Please wait…' : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
