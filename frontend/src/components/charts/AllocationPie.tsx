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
}

/** Custom label renderer.
 *  - Forces `c.ink` fill (Recharts otherwise inherits each slice's color, which
 *    can fall below WCAG AA against the paper background).
 *  - Adds a paper-colored stroke halo via paint-order so labels stay legible
 *    even when they overlap a neighbouring slice.
 *  - Suppresses the label for slivers under 2% to keep the chart breathable.
 */
function renderLabel(c: typeof CHART_LIGHT | typeof CHART_DARK) {
  return function PieLabel(props: PieLabelRenderProps) {
    const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, ticker, weight_pct } = props
    // 1.5% threshold — anything that would round to "2%" or higher in the
    // label gets shown; tiny slivers (≤1%) stay clean.
    if (!ticker || weight_pct == null || weight_pct < 1.5) return null

    const radius = outerRadius + 14
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    const anchor = x > cx ? 'start' : 'end'

    return (
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
        fontSize={11}
        style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic' }}
      >
        {`${ticker} ${weight_pct.toFixed(0)}%`}
      </text>
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
