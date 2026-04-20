import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Ornament } from '@/components/ui/Ornament'
import { TickerPriceChart } from '@/components/charts/TickerPriceChart'
import { TransactionsTable } from '@/components/transactions/TransactionsTable'
import { useHoldings } from '@/hooks/useHoldings'
import { useTransactions } from '@/hooks/useTransactions'
import { fmtNum, fmtPct, fmtUsd, pnlClass } from '@/lib/format'

export default function TickerDetail() {
  const { symbol = '' } = useParams()
  const ticker = symbol.toUpperCase()

  const { data: holdings } = useHoldings()
  const { data: txs } = useTransactions({ ticker })
  const h = holdings?.find((x) => x.ticker === ticker)

  return (
    <div className="space-y-6 animate-fade-in-paper">
      <Link
        to="/holdings"
        className="text-sm text-ink-muted hover:text-umber inline-flex items-center gap-1 font-display italic transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> All holdings
      </Link>

      <h1 className="font-display italic text-5xl text-ink tracking-wide pl-2">{ticker}</h1>

      {h ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniStat label="Qty" value={fmtNum(h.qty)} tilt="-0.3deg" />
          <MiniStat label="Avg cost" value={fmtUsd(h.avg_cost)} tilt="0.4deg" />
          <MiniStat label="Price" value={fmtUsd(h.current_price)} tilt="-0.4deg" />
          <MiniStat
            label="Unrealized P&L"
            value={fmtUsd(h.unrealized_pnl)}
            sub={fmtPct(h.unrealized_pnl_pct)}
            tone={pnlClass(h.unrealized_pnl)}
            tilt="0.3deg"
          />
        </div>
      ) : (
        <div className="text-sm text-ink-muted italic">No open position.</div>
      )}

      <Ornament symbol="❦" />

      <Card style={{ transform: 'rotate(-0.2deg)' }}>
        <CardBody>
          <TickerPriceChart ticker={ticker} />
        </CardBody>
      </Card>

      <Card style={{ transform: 'rotate(0.18deg)' }}>
        <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
        <CardBody className="p-0">
          <TransactionsTable rows={txs ?? []} />
        </CardBody>
      </Card>
    </div>
  )
}

function MiniStat({
  label, value, sub, tone, tilt,
}: {
  label: string
  value: string
  sub?: string
  tone?: string
  tilt?: string
}) {
  return (
    <Card style={tilt ? { transform: `rotate(${tilt})` } : undefined}>
      <CardBody>
        <div className="font-display italic text-xs text-ink-muted tracking-wider uppercase">
          {label}
        </div>
        <div className="mt-1 num text-lg font-medium text-ink">{value}</div>
        {sub && <div className={`num text-xs ${tone ?? 'text-ink-muted'}`}>{sub}</div>}
      </CardBody>
    </Card>
  )
}
