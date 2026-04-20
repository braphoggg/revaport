import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'h-10 w-full bg-transparent border-0 border-b border-edge px-1 pb-1 pr-7',
          'font-body text-[15px] text-ink',
          'focus:outline-none focus:border-brass focus:border-b-2 focus:-mb-px',
          'appearance-none cursor-pointer transition-colors',
          // Custom serif chevron, brass tint
          "bg-no-repeat bg-[length:14px] bg-[position:right_4px_center]",
          "bg-[url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23a8853e'%3E%3Cpath d='M3 6l5 5 5-5z'/%3E%3C/svg%3E\")]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    )
  },
)
