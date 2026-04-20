import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useImportTransactions } from '@/hooks/useTransactions'
import type { ImportResult } from '@/api/transactions'

interface Props {
  open: boolean
  onClose: () => void
}

export function ImportCsvDialog({ open, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const imp = useImportTransactions()

  async function runPreview() {
    if (!file) return
    try {
      const result = await imp.mutateAsync({ file, commit: false })
      setPreview(result)
    } catch (err: unknown) {
      setPreview({ ok: false, rows: 0, errors: [err instanceof Error ? err.message : String(err)] })
    }
  }

  async function commit() {
    if (!file) return
    try {
      const result = await imp.mutateAsync({ file, commit: true })
      setPreview(result)
      if (result.ok) {
        setTimeout(() => { setPreview(null); setFile(null); onClose() }, 1500)
      }
    } catch (err: unknown) {
      setPreview({ ok: false, rows: 0, errors: [err instanceof Error ? err.message : String(err)] })
    }
  }

  function close() {
    setFile(null); setPreview(null); onClose()
  }

  return (
    <Dialog open={open} onClose={close} title="Import CSV">
      <div className="space-y-3 text-sm">
        <p className="text-xs text-ink-muted italic font-display">
          Columns: <code className="num text-ink not-italic">date, ticker, tx_type, qty, price</code>, optional <code className="num text-ink not-italic">fees, notes</code>.
          Dates in ISO format (e.g. <code className="num text-ink not-italic">2024-03-15</code>).
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null) }}
          className="text-xs text-ink-muted file:bg-paper-3 file:border file:border-edge file:text-ink file:rounded-paper-sm file:px-3 file:py-1 file:mr-3 file:font-display file:italic file:cursor-pointer file:hover:bg-brass/20"
        />
        {preview && (
          <div className="max-h-60 overflow-auto rounded-paper-sm border border-edge paper-2 p-3">
            <div className={preview.ok ? 'text-moss font-display italic' : 'text-oxblood font-display italic'}>
              {preview.ok ? `✓ ${preview.rows} rows parsed` : `✗ ${preview.errors.length} errors`}
            </div>
            {preview.errors.length > 0 && (
              <ul className="mt-2 text-xs text-oxblood space-y-0.5 italic">
                {preview.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            {preview.tickers && (
              <div className="mt-2 text-xs text-ink-muted italic">Updated: <span className="num text-ink not-italic">{preview.tickers.join(', ')}</span></div>
            )}
            {preview.splits_injected && preview.splits_injected.length > 0 && (
              <div className="mt-2 text-xs text-rust italic">
                Auto-injected <span className="num">{preview.splits_injected.length}</span> split{preview.splits_injected.length > 1 ? 's' : ''} from yfinance:{' '}
                {preview.splits_injected.map(s => `${s.ticker} ${s.date} (${s.ratio}:1)`).join(', ')}
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="secondary" onClick={runPreview} disabled={!file || imp.isPending}>Preview</Button>
          <Button onClick={commit} disabled={!file || !preview?.ok || imp.isPending}>
            {imp.isPending ? 'Importing…' : 'Commit'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
