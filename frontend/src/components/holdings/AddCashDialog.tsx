import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { useCreateHolding } from '@/hooks/useHoldings'
import { useCreateTransaction } from '@/hooks/useTransactions'

interface Props {
  open: boolean
  onClose: () => void
}

export function AddCashDialog({ open, onClose }: Props) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  const createHolding = useCreateHolding()
  const createTx = useCreateTransaction()
  const busy = createHolding.isPending || createTx.isPending

  function reset() {
    setAmount('')
    setDate(new Date().toISOString().slice(0, 10))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = Number(amount)
    if (!(amt > 0)) return setError('Amount must be greater than 0')
    try {
      await createHolding.mutateAsync({ ticker: 'CASH', notes: null }).catch((err) => {
        if (err?.status !== 409) throw err
      })
      await createTx.mutateAsync({
        ticker: 'CASH',
        tx_type: 'BUY',
        qty: amt,
        price: 1.0,
        fees: 0,
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
    <Dialog open={open} onClose={onClose} title="Add cash position">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-ink-muted italic font-display">
          Records a USD cash balance at $1.00/unit. To record a withdrawal, add a SELL transaction for CASH.
        </p>
        <div>
          <label className="block text-xs text-ink-muted mb-1 font-display italic tracking-wider uppercase">Amount (USD)</label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="5000.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-ink-muted mb-1 font-display italic tracking-wider uppercase">Date deposited</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {error && <div className="text-xs text-oxblood italic">{error}</div>}
        <div className="flex justify-end gap-2 pt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
