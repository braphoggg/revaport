import { useMemo, useState } from 'react'
import { DollarSign, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Ornament } from '@/components/ui/Ornament'
import { HoldingsTable } from '@/components/holdings/HoldingsTable'
import { AddHoldingDialog } from '@/components/holdings/AddHoldingForm'
import { AddCashDialog } from '@/components/holdings/AddCashDialog'
import { useHoldings } from '@/hooks/useHoldings'

export default function Holdings() {
  const [open, setOpen] = useState(false)
  const [cashOpen, setCashOpen] = useState(false)
  const [tickerFilter, setTickerFilter] = useState('')
  const [hideClosed, setHideClosed] = useState(true)
  const { data, isLoading, error } = useHoldings()

  const filtered = useMemo(() => {
    const q = tickerFilter.trim().toUpperCase()
    return (data ?? []).filter((h) => {
      if (hideClosed && h.qty <= 0) return false
      if (q && !h.ticker.toUpperCase().includes(q)) return false
      return true
    })
  }, [data, tickerFilter, hideClosed])

  const closedCount = (data ?? []).filter((h) => h.qty <= 0).length

  return (
    <div className="space-y-5 animate-fade-in-paper">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display italic text-4xl text-ink tracking-wide pl-2">Holdings</h1>
          <p className="font-display text-sm text-ink-muted italic pl-2 mt-1">
            — every position, open and closed —
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCashOpen(true)}>
            <DollarSign className="h-4 w-4 mr-1.5" /> Add cash
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add holding
          </Button>
        </div>
      </div>

      <Ornament symbol="✦" />

      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-64">
          <Input
            placeholder="Filter by ticker…"
            value={tickerFilter}
            onChange={(e) => setTickerFilter(e.target.value.toUpperCase())}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted select-none cursor-pointer font-display italic">
          <input
            type="checkbox"
            checked={hideClosed}
            onChange={(e) => setHideClosed(e.target.checked)}
            className="h-4 w-4 accent-brass"
          />
          Hide closed positions
          {closedCount > 0 && (
            <span className="text-xs text-edge num">({closedCount})</span>
          )}
        </label>
        <div className="ml-auto text-xs text-ink-muted font-display italic">
          <span className="num text-ink">{filtered.length}</span> of <span className="num">{data?.length ?? 0}</span> holdings
        </div>
      </div>

      <Card style={{ transform: 'rotate(-0.2deg)' }}>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-ink-muted italic animate-pulse-flicker">loading…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-oxblood italic">{(error as Error).message}</div>
          ) : (
            <HoldingsTable rows={filtered} />
          )}
        </CardBody>
      </Card>

      <AddHoldingDialog open={open} onClose={() => setOpen(false)} />
      <AddCashDialog open={cashOpen} onClose={() => setCashOpen(false)} />
    </div>
  )
}
