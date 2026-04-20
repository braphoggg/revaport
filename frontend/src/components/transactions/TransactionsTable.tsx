import { useState } from 'react'
import type { Transaction } from '@/types/api'
import { Table, TBody, TD, SortableTH, THead, TR } from '@/components/ui/Table'
import type { SortDir } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { fmtDate, fmtNum, fmtUsd } from '@/lib/format'
import { useDeleteTransaction } from '@/hooks/useTransactions'
import { Trash2 } from 'lucide-react'

const TONE_BY_TYPE = {
  BUY: 'success' as const,
  SELL: 'danger' as const,
  DIVIDEND: 'info' as const,
  SPLIT: 'warning' as const,
}

type SortKey = 'executed_at' | 'ticker' | 'tx_type' | 'qty' | 'price' | 'fees' | 'total'

function getVal(t: Transaction, key: SortKey): number | string {
  switch (key) {
    case 'executed_at': return t.executed_at
    case 'ticker':      return t.ticker
    case 'tx_type':     return t.tx_type
    case 'qty':         return t.qty
    case 'price':       return t.price
    case 'fees':        return t.fees
    case 'total':       return t.tx_type === 'DIVIDEND' ? t.price : t.qty * t.price
  }
}

function sorted(rows: Transaction[], key: SortKey, dir: SortDir): Transaction[] {
  return [...rows].sort((a, b) => {
    const av = getVal(a, key), bv = getVal(b, key)
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
    return dir === 'asc' ? cmp : -cmp
  })
}

interface Props { rows: Transaction[] }

export function TransactionsTable({ rows }: Props) {
  const del = useDeleteTransaction()
  const [sortKey, setSortKey] = useState<SortKey>('executed_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'executed_at' ? 'desc' : 'asc') }
  }

  function dir(key: SortKey): SortDir | null {
    return key === sortKey ? sortDir : null
  }

  if (rows.length === 0) {
    return <div className="text-center text-ink-muted italic py-16 text-sm font-display">No transactions yet.</div>
  }

  const displayed = sorted(rows, sortKey, sortDir)

  return (
    <Table>
      <THead>
        <tr>
          <SortableTH sortDir={dir('executed_at')} onSort={() => handleSort('executed_at')}>Date</SortableTH>
          <SortableTH sortDir={dir('ticker')}      onSort={() => handleSort('ticker')}>Ticker</SortableTH>
          <SortableTH sortDir={dir('tx_type')}     onSort={() => handleSort('tx_type')}>Type</SortableTH>
          <SortableTH sortDir={dir('qty')}         onSort={() => handleSort('qty')}    className="text-right">Qty</SortableTH>
          <SortableTH sortDir={dir('price')}       onSort={() => handleSort('price')}  className="text-right">Price</SortableTH>
          <SortableTH sortDir={dir('fees')}        onSort={() => handleSort('fees')}   className="text-right">Fees</SortableTH>
          <SortableTH sortDir={dir('total')}       onSort={() => handleSort('total')}  className="text-right">Total</SortableTH>
          <th className="px-3 py-2.5 text-left font-display italic text-[13px] tracking-wider font-medium">Notes</th>
          <th className="px-3 py-2.5" />
        </tr>
      </THead>
      <TBody>
        {displayed.map((t) => {
          const total = t.tx_type === 'DIVIDEND' ? t.price : t.qty * t.price
          return (
            <TR key={t.id}>
              <TD className="num text-ink-muted">{fmtDate(t.executed_at)}</TD>
              <TD className="font-display italic text-ink">{t.ticker}</TD>
              <TD><Badge tone={TONE_BY_TYPE[t.tx_type]}>{t.tx_type}</Badge></TD>
              <TD className="text-right num">{fmtNum(t.qty)}</TD>
              <TD className="text-right num">{fmtUsd(t.price)}</TD>
              <TD className="text-right num">{t.fees > 0 ? fmtUsd(t.fees) : '—'}</TD>
              <TD className="text-right num text-ink">{fmtUsd(total)}</TD>
              <TD className="text-ink-muted italic text-sm">{t.notes ?? ''}</TD>
              <TD className="text-right">
                <button
                  onClick={() => { if (confirm('Delete this transaction?')) del.mutate(t.id) }}
                  className="text-ink-muted hover:text-oxblood transition-colors"
                  title="Delete transaction"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </TD>
            </TR>
          )
        })}
      </TBody>
    </Table>
  )
}
