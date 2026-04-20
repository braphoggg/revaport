import { useState } from 'react'
import { useCreateHolding } from '@/hooks/useHoldings'
import { useCreateTransaction } from '@/hooks/useTransactions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog } from '@/components/ui/Dialog'

interface Props {
  open: boolean
  onClose: () => void
}

export function AddHoldingDialog({ open, onClose }: Props) {
  const [ticker, setTicker] = useState('')
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [fees, setFees] = useState('0')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createHolding = useCreateHolding()
  const createTx = useCreateTransaction()

  const busy = createHolding.isPending || createTx.isPending

  function reset() {
    setTicker(''); setQty(''); setPrice(''); setFees('0')
    setDate(new Date().toISOString().slice(0, 10))
    setNotes(''); setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const qtyN = Number(qty); const priceN = Number(price); const feesN = Number(fees) || 0
    if (!ticker.trim()) return setError('ticker is required')
    if (!(qtyN > 0)) return setError('qty must be > 0')
    if (!(priceN >= 0)) return setError('price must be ≥ 0')

    try {
      await createHolding.mutateAsync({ ticker: ticker.trim(), notes: notes || null }).catch((err) => {
        if (err?.status !== 409) throw err
      })
      await createTx.mutateAsync({
        ticker: ticker.trim(),
        tx_type: 'BUY',
        qty: qtyN,
        price: priceN,
        fees: feesN,
        executed_at: new Date(date).toISOString(),
        notes: null,
      })
      reset()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add holding">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs text-ink-muted mb-1 font-display italic tracking-wider uppercase">Ticker</label>
          <Input placeholder="AAPL, BRK.B, BTC-USD" value={ticker} onChange={(e) => setTicker(e.target.value)} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-muted mb-1 font-display italic tracking-wider uppercase">Qty</label>
            <Input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1 font-display italic tracking-wider uppercase">Buy price</label>
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
          <label className="block text-xs text-ink-muted mb-1 font-display italic tracking-wider uppercase">Notes (optional)</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <div className="text-xs text-oxblood italic">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
