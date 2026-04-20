import { cn } from '@/lib/cn'

interface OrnamentProps {
  symbol?: '❦' | '✦' | '❧' | '✧' | '⁂'
  className?: string
}

/* Decorative divider — flanked hairlines around a centered Unicode dingbat.
   Used to break up sections without resorting to a bold heading or bg-color. */
export function Ornament({ symbol = '❦', className }: OrnamentProps) {
  return (
    <div className={cn('flex items-center gap-3 text-edge select-none my-2', className)} aria-hidden="true">
      <span className="flex-1 h-px bg-edge/60" />
      <span className="text-brass text-base leading-none">{symbol}</span>
      <span className="flex-1 h-px bg-edge/60" />
    </div>
  )
}
