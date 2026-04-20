import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Ornament } from '@/components/ui/Ornament'
import { fmtPct, fmtUsd, pnlClass } from '@/lib/format'
import { usePortfolioSummary } from '@/hooks/usePortfolio'
import { AllocationPie } from '@/components/charts/AllocationPie'
import { PortfolioValueChart } from '@/components/charts/PortfolioValueChart'

export default function Dashboard() {
  const { data, isLoading } = usePortfolioSummary()

  const s = data ?? {
    total_value: 0, total_cost: 0, unrealized_pnl: 0, unrealized_pnl_pct: 0,
    day_change: 0, day_change_pct: 0, realized_pnl: 0, positions: 0, allocations: [],
  }

  return (
    <div className="space-y-6 animate-fade-in-paper">
      <div>
        <h1 className="font-display italic text-4xl text-ink tracking-wide pl-2">Dashboard</h1>
        <p className="font-display text-sm text-ink-muted italic pl-2 mt-1">
          — a brief survey of the holdings —
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total value"
          value={fmtUsd(s.total_value)}
          sub={`${s.positions} positions`}
          tilt="-0.4deg"
          height="h-[112px]"
        />
        <StatCard
          label="Day change"
          value={fmtUsd(s.day_change)}
          sub={fmtPct(s.day_change_pct)}
          tone={pnlClass(s.day_change)}
          tilt="0.5deg"
          height="h-[122px]"
        />
        <StatCard
          label="Unrealized P&L"
          value={fmtUsd(s.unrealized_pnl)}
          sub={fmtPct(s.unrealized_pnl_pct)}
          tone={pnlClass(s.unrealized_pnl)}
          tilt="-0.3deg"
          height="h-[116px]"
        />
        <StatCard
          label="Realized P&L"
          value={fmtUsd(s.realized_pnl)}
          sub="lifetime"
          tone={pnlClass(s.realized_pnl)}
          tilt="0.4deg"
          height="h-[120px]"
        />
      </div>

      <Ornament symbol="❦" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" style={{ transform: 'rotate(-0.25deg)' }}>
          <CardBody><PortfolioValueChart /></CardBody>
        </Card>
        <Card style={{ transform: 'rotate(0.35deg)' }}>
          <CardHeader><CardTitle>Allocation</CardTitle></CardHeader>
          <CardBody>
            <AllocationPie allocations={s.allocations} />
          </CardBody>
        </Card>
      </div>

      {isLoading && <div className="text-xs text-ink-muted italic animate-pulse-flicker">loading…</div>}
    </div>
  )
}

function StatCard({
  label, value, sub, tone, tilt, height,
}: {
  label: string
  value: string
  sub?: string
  tone?: string
  tilt?: string
  height?: string
}) {
  return (
    <Card style={tilt ? { transform: `rotate(${tilt})` } : undefined}>
      <CardBody className={height}>
        <div className="font-display italic text-xs text-ink-muted tracking-wider uppercase">
          {label}
        </div>
        <div className="mt-1 num text-2xl font-medium text-ink">{value}</div>
        {sub && <div className={`mt-1 num text-xs ${tone ?? 'text-ink-muted'}`}>{sub}</div>}
      </CardBody>
    </Card>
  )
}
