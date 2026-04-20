const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const num = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })

export function fmtUsd(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return usd.format(v)
}

export function fmtUsdCompact(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return usdCompact.format(v)
}

export function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`
}

export function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return num.format(v)
}

export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return '—'
  const d = v instanceof Date ? v : new Date(v)
  return d.toLocaleDateString()
}

export function fmtDateTime(v: string | Date | null | undefined): string {
  if (!v) return '—'
  const d = v instanceof Date ? v : new Date(v)
  return d.toLocaleString()
}

export function fmtTime(v: string | Date | null | undefined): string {
  if (!v) return '—'
  const d = v instanceof Date ? v : new Date(v)
  return d.toLocaleTimeString()
}

export function pnlClass(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v) || v === 0) return 'text-ink-muted'
  return v > 0 ? 'text-moss' : 'text-oxblood'
}
