import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 34, 24, 0.62)' }}
      onClick={onClose}
    >
      <div
        className={cn(
          'paper w-full max-w-lg rounded-paper border border-edge shadow-paper-lg animate-fade-in-paper',
          className,
        )}
        style={{ transform: 'rotate(-0.4deg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-edge/60 px-5 py-3 paper-2 rounded-t-paper">
          <h3 className="font-display italic text-lg text-ink tracking-wide">{title}</h3>
          <button
            onClick={onClose}
            className="font-display text-2xl leading-none text-ink-muted hover:text-oxblood transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
