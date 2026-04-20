import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    'bg-teal text-paper border border-teal hover:bg-teal-2 hover:border-teal-2 focus-visible:outline-brass disabled:opacity-50',
  secondary:
    'bg-paper-2 border border-edge text-ink hover:bg-paper-3 focus-visible:outline-brass',
  ghost:
    'bg-transparent text-ink-muted hover:text-ink hover:bg-paper-2 border border-transparent',
  danger:
    'bg-oxblood text-paper border border-oxblood hover:opacity-90 focus-visible:outline-brass',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-5 text-[15px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...props }, ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-paper-sm font-display font-medium tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 hover-jitter',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
})
