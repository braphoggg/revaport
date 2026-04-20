import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-10 w-full bg-transparent border-0 border-b border-edge px-1 pb-1',
          'font-body text-[15px] text-ink placeholder:text-ink-muted/70 placeholder:italic',
          'focus:outline-none focus:border-brass focus:border-b-2 focus:-mb-px',
          'transition-colors',
          className,
        )}
        {...props}
      />
    )
  },
)
