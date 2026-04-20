import { useState } from 'react'
import type { TxType } from '@/types/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Dialog } from '@/components/ui/Dialog'
import { useCreateTransaction } from '@/hooks/useTransactions'

interface Props {
  open: boolean
  onClose: () => void
  defaultTicker?: string
}

export function AddTransactionDialog({ open, onClose, defaultTicker }: Props) {
  const [ticker, setTicker] = useState(defaultTicker ?? '')
  const [txType, setTxType] = useState<TxType>('BUY')
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [fees, setFees] = useState('0')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const create = useCreateTransaction()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await create.mutateAsync({
        ticker: ticker.trim(),
        tx_type: txType,
        qty: Number(qty) || 0,
        price: Number(price) || 0,
        fees: Number(fees) || 0,
        executed_at: new Date(date).toISOString(),
        notes: notes || null,
      })
      setQty(''); setPrice(''); setFees('0'); setNotes(''); setError(null)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const qtyLabel = txType === 'SPLIT' ? 'Ratio (e.g. 2 for 2:1)' : 'Qty'
  const priceLabel = txType === 'DIVIDEND' ? 'Total dividend ($)' : 'Price'

  return (
    <Dialog open={open} onClose={onClose} title="Add transaction">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-muted mb-1 font-display italic tracking-wider uppercase">Ticker</label>
            <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" autoFocus />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1 font-display italic tracking-wider uppercase">Type</label>
            <Select value={txType} onChange={(e) => setTxType(e.target.value as TxType)}>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
              <option value="DIVIDEND">DIVIDEND</option>
              <option value="SPLIT">SPLIT</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-muted mb-1 font-display italic tracking-wider uppercase">{qtyLabel}</label>
            <Input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1 font-display italic tracking-wider uppercase">{priceLabel}</label>
            <Input type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-muted mb-1 font-display italic tracking-wider uppercase">Fees</label>
            <Input type="number" step="any" value={fees} onChange={(e) => setFees(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1 font-display italic tracking-wider uppercase">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-ink-muted mb-1 font-display italic tracking-wider uppercase">Notes</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <div className="text-xs text-oxblood italic">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={create.isPending}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Adding…' : 'Add'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
