import { useMemo, useState } from 'react'
import { Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Ornament } from '@/components/ui/Ornament'
import { TransactionsTable } from '@/components/transactions/TransactionsTable'
import { AddTransactionDialog } from '@/components/transactions/AddTransactionForm'
import { ImportCsvDialog } from '@/components/transactions/ImportCsvDialog'
import { useTransactions } from '@/hooks/useTransactions'
import type { TxType } from '@/types/api'
import { cn } from '@/lib/cn'

const TYPE_OPTIONS: Array<TxType | 'ALL'> = ['ALL', 'BUY', 'SELL', 'DIVIDEND', 'SPLIT']

export default function Transactions() {
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [tickerFilter, setTickerFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<TxType | 'ALL'>('ALL')
  const { data, isLoading, error } = useTransactions({ ticker: tickerFilter || undefined })

  const filtered = useMemo(() => {
    if (typeFilter === 'ALL') return data ?? []
    return (data ?? []).filter((t) => t.tx_type === typeFilter)
  }, [data, typeFilter])

  return (
    <div className="space-y-5 animate-fade-in-paper">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display italic text-4xl text-ink tracking-wide pl-2">Transactions</h1>
          <p className="font-display text-sm text-ink-muted italic pl-2 mt-1">
            — the ledger of all movements —
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" /> Import CSV
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add transaction
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
        <div className="inline-flex border border-edge rounded-paper-sm overflow-hidden text-sm bg-paper-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setTypeFilter(opt)}
              className={cn(
                'px-3 h-9 transition-colors font-display tracking-wider text-[13px] border-r border-edge/50 last:border-r-0',
                typeFilter === opt
                  ? 'bg-teal text-paper italic'
                  : 'text-ink-muted hover:text-ink hover:bg-paper-3',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-ink-muted font-display italic">
          <span className="num text-ink">{filtered.length}</span> of <span className="num">{data?.length ?? 0}</span> transactions
        </div>
      </div>

      <Card style={{ transform: 'rotate(0.18deg)' }}>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-ink-muted italic animate-pulse-flicker">loading…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-oxblood italic">{(error as Error).message}</div>
          ) : (
            <TransactionsTable rows={filtered} />
          )}
        </CardBody>
      </Card>

      <AddTransactionDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <ImportCsvDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
