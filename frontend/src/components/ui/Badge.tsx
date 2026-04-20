import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-paper-3 text-ink border-edge',
  success: 'bg-moss/20 text-moss border-moss/50',
  warning: 'bg-rust/15 text-rust border-rust/50',
  danger:  'bg-oxblood/15 text-oxblood border-oxblood/50',
  info:    'bg-teal/15 text-teal border-teal/50',
}

export function Badge({ tone = 'neutral', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-paper-sm border px-2 py-0.5',
        'font-display italic text-xs tracking-wide',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
