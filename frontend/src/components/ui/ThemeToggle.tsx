import { cn } from '@/lib/cn'
import { useTheme, type Theme } from '@/lib/theme'

const OPTIONS: { value: Theme; label: string; title: string }[] = [
  { value: 'auto',  label: 'auto',  title: 'Follow system preference' },
  { value: 'light', label: 'day',   title: 'Light — parchment under candlelight' },
  { value: 'dark',  label: 'night', title: 'Dark — oil painting in a dim room' },
]

/** Three-segment theme switcher styled as ledger margin notes.
 *  Active segment glows brass; the others sit in muted ink. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-paper-sm border border-edge/40 paper-2"
    >
      {OPTIONS.map(({ value, label, title }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={title}
            onClick={() => setTheme(value)}
            className={cn(
              'px-2 py-0.5 text-[11px] font-display italic tracking-wider rounded-paper-sm transition-colors',
              active
                ? 'text-brass bg-brass/10'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
