import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote } from 'lucide-react'
import type { Holding } from '@/types/api'
import { Table, TBody, TD, SortableTH, THead, TR } from '@/components/ui/Table'
import type { SortDir } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { fmtNum, fmtPct, fmtUsd, fmtTime, pnlClass } from '@/lib/format'
import { useDeleteHolding } from '@/hooks/useHoldings'
import { Trash2 } from 'lucide-react'

type SortKey = 'ticker' | 'qty' | 'avg_cost' | 'current_price' | 'market_value' | 'day_change' | 'unrealized_pnl' | 'realized_pnl'

function getVal(h: Holding, key: SortKey): number | string {
  switch (key) {
    case 'ticker':       return h.ticker
    case 'qty':          return h.qty
    case 'avg_cost':     return h.avg_cost
    case 'current_price': return h.current_price ?? -Infinity
    case 'market_value': return h.market_value
    case 'day_change':   return h.day_change
    case 'unrealized_pnl': return h.unrealized_pnl
    case 'realized_pnl': return h.realized_pnl
  }
}

function sorted(rows: Holding[], key: SortKey, dir: SortDir): Holding[] {
  return [...rows].sort((a, b) => {
    const av = getVal(a, key), bv = getVal(b, key)
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
    return dir === 'asc' ? cmp : -cmp
  })
}

interface Props { rows: Holding[] }

export function HoldingsTable({ rows }: Props) {
  const del = useDeleteHolding()
  const [sortKey, setSortKey] = useState<SortKey>('ticker')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function dir(key: SortKey): SortDir | null {
    return key === sortKey ? sortDir : null
  }

  if (rows.length === 0) {
    return <div className="text-center text-ink-muted italic font-display py-16 text-sm">No holdings yet. Add your first position to begin the ledger.</div>
  }

  const displayed = sorted(rows, sortKey, sortDir)

  return (
    <Table>
      <THead>
        <tr>
          <SortableTH sortDir={dir('ticker')}       onSort={() => handleSort('ticker')}>Ticker</SortableTH>
          <SortableTH sortDir={dir('qty')}          onSort={() => handleSort('qty')}          className="text-right">Qty</SortableTH>
          <SortableTH sortDir={dir('avg_cost')}     onSort={() => handleSort('avg_cost')}     className="text-right">Avg cost</SortableTH>
          <SortableTH sortDir={dir('current_price')} onSort={() => handleSort('current_price')} className="text-right">Price</SortableTH>
          <SortableTH sortDir={dir('market_value')} onSort={() => handleSort('market_value')} className="text-right">Market value</SortableTH>
          <SortableTH sortDir={dir('day_change')}   onSort={() => handleSort('day_change')}   className="text-right">Day</SortableTH>
          <SortableTH sortDir={dir('unrealized_pnl')} onSort={() => handleSort('unrealized_pnl')} className="text-right">Unrealized P&amp;L</SortableTH>
          <SortableTH sortDir={dir('realized_pnl')} onSort={() => handleSort('realized_pnl')} className="text-right">Realized</SortableTH>
          <th className="px-3 py-2" />
        </tr>
      </THead>
      <TBody>
        {displayed.map((h) => {
          const isCash = h.ticker === 'CASH'
          return (
          <TR key={h.id}>
            <TD>
              {isCash ? (
                <span className="font-display italic text-ink inline-flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 text-brass" /> Cash <span className="text-ink-muted not-italic text-xs">(USD)</span>
                </span>
              ) : (
                <Link
                  to={`/ticker/${encodeURIComponent(h.ticker)}`}
                  className="font-display italic text-ink hover:text-umber transition-colors"
                >
                  {h.ticker}
                </Link>
              )}
              {!isCash && h.price_stale && <Badge tone="warning" className="ml-2">stale</Badge>}
            </TD>
            <TD className="text-right num">{isCash ? fmtUsd(h.qty) : fmtNum(h.qty)}</TD>
            <TD className="text-right num">{isCash ? '—' : fmtUsd(h.avg_cost)}</TD>
            <TD className="text-right">
              {isCash ? (
                <span className="text-ink-muted text-xs italic font-display">$1.00 fixed</span>
              ) : (
                <>
                  <span className="num">{fmtUsd(h.current_price)}</span>
                  {h.price_as_of && <div className="text-[10px] text-ink-muted num">as of {fmtTime(h.price_as_of)}</div>}
                </>
              )}
            </TD>
            <TD className="text-right num">{fmtUsd(h.market_value)}</TD>
            <TD className={`text-right num ${pnlClass(h.day_change)}`}>
              {fmtUsd(h.day_change)}
              <div className="text-xs">{fmtPct(h.day_change_pct)}</div>
            </TD>
            <TD className={`text-right num ${pnlClass(h.unrealized_pnl)}`}>
              {fmtUsd(h.unrealized_pnl)}
              <div className="text-xs">{fmtPct(h.unrealized_pnl_pct)}</div>
            </TD>
            <TD className={`text-right num ${pnlClass(h.realized_pnl)}`}>{fmtUsd(h.realized_pnl)}</TD>
            <TD className="text-right">
              <button
                onClick={() => { if (confirm(`Delete ${isCash ? 'cash position' : h.ticker} and all its transactions?`)) del.mutate(h.id) }}
                className="text-ink-muted hover:text-oxblood transition-colors"
                title="Delete holding"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </TD>
          </TR>
        )})}
      </TBody>
    </Table>
  )
}
