import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { ArrowLeftRight, Briefcase, LayoutDashboard, BookOpen } from 'lucide-react'
import { ConnectionIndicator } from './ConnectionIndicator'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/holdings', label: 'Holdings', icon: Briefcase },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
]

export function Shell() {
  return (
    <div className="flex h-full">
      <aside
        className="w-60 shrink-0 paper-2 border-r border-edge flex flex-col relative"
        style={{
          // Subtle angled bottom edge — Disco Elysium asymmetry
          clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 18px), 0 100%)',
        }}
      >
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-edge/60">
          <BookOpen className="h-5 w-5 text-brass animate-flicker" />
          <span className="font-display italic text-xl text-ink tracking-wider">port</span>
          <span className="ml-auto font-display text-xs text-ink-muted tracking-widest uppercase">
            ledger
          </span>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-paper-sm transition-colors group relative',
                  'font-display text-[15px] tracking-wide',
                  isActive
                    ? 'text-ink bg-paper-3'
                    : 'text-ink-muted hover:text-ink hover:bg-paper-3/50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-4 w-4', isActive ? 'text-brass' : 'text-ink-muted group-hover:text-umber')} />
                  <span className={cn(isActive && 'italic')}>{label}</span>
                  {isActive && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-brass rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-edge/60 text-[11px] text-ink-muted font-display italic tracking-wider">
          <div>local · usd only</div>
          <div className="text-edge mt-0.5">— v0.1 —</div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="flex items-center justify-between px-8 py-3 border-b border-edge/50">
          <span className="font-display italic text-sm text-ink-muted tracking-widest uppercase">
            « the books »
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ConnectionIndicator />
          </div>
        </header>
        <div className="px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
