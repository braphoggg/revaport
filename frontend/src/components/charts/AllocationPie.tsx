import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { PortfolioAllocation } from '@/types/api'
import { fmtPct, fmtUsd } from '@/lib/format'
import { CHART_DARK, CHART_LIGHT, useChartPalette, usePiePalette } from './chartTheme'

const RADIAN = Math.PI / 180

interface PieLabelRenderProps {
  cx?: number
  cy?: number
  midAngle?: number
  outerRadius?: number
  ticker?: string
  weight_pct?: number
  market_value?: number
}

/** Custom label renderer.
 *  - Forces `c.ink` fill (Recharts otherwise inherits each slice's color, which
 *    can fall below WCAG AA against the paper background).
 *  - Adds a paper-colored stroke halo via paint-order so labels stay legible
 *    even when they overlap a neighbouring slice.
 *  - For small slices (<4%), draws a thin leader line and pushes the label
 *    further out, so positions like warrants stay labelled instead of being
 *    rendered as a coloured-but-anonymous wedge. Sub-1% slices drop the
 *    percent (showing "0%" would be misleading) and keep just the ticker.
 *  - Skips truly zero-value entries (no price data) — they have no visible
 *    slice and a stray label there would overlap a real one.
 */
function renderLabel(c: typeof CHART_LIGHT | typeof CHART_DARK) {
  return function PieLabel(props: PieLabelRenderProps) {
    const {
      cx = 0,
      cy = 0,
      midAngle = 0,
      outerRadius = 0,
      ticker,
      weight_pct,
      market_value = 0,
    } = props
    if (!ticker || weight_pct == null || market_value <= 0) return null

    const isSmall = weight_pct < 4
    const labelOffset = isSmall ? 26 : 14
    const cos = Math.cos(-midAngle * RADIAN)
    const sin = Math.sin(-midAngle * RADIAN)

    const x = cx + (outerRadius + labelOffset) * cos
    const y = cy + (outerRadius + labelOffset) * sin
    const anchor = x > cx ? 'start' : 'end'

    // Leader line for small slices: from just outside the slice edge out to
    // ~3px short of the label. Skipped for big slices since the label sits
    // close enough to read without it.
    const leaderStart = outerRadius + 2
    const leaderEnd = outerRadius + labelOffset - 3
    const lx1 = cx + leaderStart * cos
    const ly1 = cy + leaderStart * sin
    const lx2 = cx + leaderEnd * cos
    const ly2 = cy + leaderEnd * sin

    // Sub-1% would round to "0%" — drop the percent for those and just print
    // the ticker so it doesn't read as zero weight.
    const text = weight_pct >= 1 ? `${ticker} ${weight_pct.toFixed(0)}%` : ticker

    return (
      <g>
        {isSmall && (
          <line
            x1={lx1}
            y1={ly1}
            x2={lx2}
            y2={ly2}
            stroke={c.inkMuted}
            strokeWidth={0.6}
            opacity={0.55}
          />
        )}
        <text
          x={x}
          y={y}
          fill={c.ink}
          stroke={c.paper}
          strokeWidth={3}
          strokeLinejoin="round"
          paintOrder="stroke"
          textAnchor={anchor}
          dominantBaseline="central"
          fontSize={isSmall ? 10 : 11}
          style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic' }}
        >
          {text}
        </text>
      </g>
    )
  }
}

export function AllocationPie({ allocations }: { allocations: PortfolioAllocation[] }) {
  const c = useChartPalette()
  const palette = usePiePalette()

  if (allocations.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-ink-muted italic">
        No allocations yet.
      </div>
    )
  }
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={allocations}
            dataKey="market_value"
            nameKey="ticker"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            stroke={c.paper}
            strokeWidth={2}
            label={renderLabel(c) as unknown as boolean}
            labelLine={false}
            // Skip the 1500ms entry animation so labels are visible
            // immediately on theme swap (Recharts only renders the labels
            // AFTER the animation completes).
            isAnimationActive={false}
          >
            {allocations.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, _n, p) => {
              const payload = (p as { payload?: PortfolioAllocation }).payload
              return [fmtUsd(Number(v)), `${payload?.ticker} (${fmtPct(payload?.weight_pct, 1)})`]
            }}
            contentStyle={{
              background: c.paper,
              border: `1px solid ${c.edge}`,
              borderRadius: '6px 8px 5px 7px',
              fontFamily: 'EB Garamond, serif',
              color: c.ink,
            }}
            labelStyle={{ color: c.inkMuted, fontStyle: 'italic' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
