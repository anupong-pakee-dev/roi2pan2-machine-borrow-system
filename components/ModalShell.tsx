'use client'
import { useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  width?: string  // e.g. '640px'
}

/**
 * Modal scrim + sheet. Closes on Esc or scrim click.
 * Keep <ModalShell> dumb — caller controls header/body/footer.
 */
export default function ModalShell({ title, onClose, children, footer, width }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/55 backdrop-blur-sm
                 animate-[fadeIn_180ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-3xl w-full max-h-[90vh]
                   overflow-y-auto shadow-pop"
        style={{ maxWidth: width || '560px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-border">
          <div className="font-display text-xl font-semibold tracking-tight">{title}</div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-panel text-muted hover:text-light transition-colors
                       grid place-items-center"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}
