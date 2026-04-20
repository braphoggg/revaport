import type { HTMLAttributes, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type SortDir = 'asc' | 'desc'

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full font-body text-[15px] text-ink', className)} {...props} />
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'paper-2 border-b border-edge text-ink-muted',
        '[&_th]:font-display [&_th]:italic [&_th]:text-[13px] [&_th]:tracking-wider [&_th]:font-medium',
        className,
      )}
      {...props}
    />
  )
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn(
        '[&_tr]:border-b [&_tr]:border-edge/30 [&_tr:last-child]:border-0',
        className,
      )}
      {...props}
    />
  )
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'transition-colors odd:bg-transparent even:bg-paper-2/50 hover:bg-brass/10',
        className,
      )}
      {...props}
    />
  )
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('text-left px-3 py-2.5', className)} {...props} />
}

interface SortableTHProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortDir?: SortDir | null
  onSort?: () => void
}

export function SortableTH({ sortDir = null, onSort, className, children, ...props }: SortableTHProps) {
  return (
    <th
      className={cn(
        'text-left px-3 py-2.5 select-none',
        onSort && 'cursor-pointer hover:text-ink',
        sortDir && 'text-ink',
        className,
      )}
      onClick={onSort}
      {...props}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {onSort && (
          <span className={cn('text-[11px] not-italic', sortDir ? 'text-brass' : 'text-edge')}>
            {sortDir === 'asc' ? '▲' : sortDir === 'desc' ? '▼' : '⬍'}
          </span>
        )}
      </span>
    </th>
  )
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-3 py-2.5', className)} {...props} />
}
