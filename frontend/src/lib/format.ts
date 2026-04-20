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

/* Range-aware tick labels for chart X-axes. The default `fmtDate` returns
 * "4/12/2024" which is too wide to fit ~6–12 ticks across a 1Y or 5Y axis,
 * so we shrink the format as the range grows:
 *   1W / 1M / 3M → "Apr 12"
 *   1Y           → "Apr 2024"
 *   5Y / MAX     → "2024"
 * Combine with <XAxis minTickGap={...}> to let Recharts auto-thin the ticks
 * so labels never overlap regardless of viewport width. */
const _axisMonthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const _axisMonthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })
const _axisYear = new Intl.DateTimeFormat('en-US', { year: 'numeric' })

export function fmtAxisDate(v: string | Date | null | undefined, range: string): string {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(v)
  const r = range.toUpperCase()
  if (r === '1W' || r === '1M' || r === '3M') return _axisMonthDay.format(d)
  if (r === '1Y') return _axisMonthYear.format(d)
  return _axisYear.format(d)
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
