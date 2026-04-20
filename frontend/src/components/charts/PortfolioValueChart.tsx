import { useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { usePortfolioHistory } from '@/hooks/usePortfolio'
import { fmtDate, fmtUsd } from '@/lib/format'
import { useChartPalette } from './chartTheme'

const RANGES = ['1W', '1M', '3M', '1Y', '5Y', 'MAX'] as const
type Range = (typeof RANGES)[number]

export function PortfolioValueChart() {
  const [range, setRange] = useState<Range>('1M')
  const { data, isLoading } = usePortfolioHistory(range)
  const c = useChartPalette()

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display italic text-base text-ink tracking-wide">Portfolio value</h3>
        <div className="flex gap-1 text-xs">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={
                'px-2 py-0.5 rounded-paper-sm font-display tracking-wider transition-colors ' +
                (r === range
                  ? 'bg-teal text-paper'
                  : 'text-ink-muted hover:text-ink')
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-xs text-ink-muted italic animate-pulse-flicker">loading…</div>
        ) : !data || data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-ink-muted italic">
            No history yet — snapshots accrue daily.
          </div>
        ) : (
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <defs>
                <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.teal} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={c.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={c.edge} strokeDasharray="2 4" opacity={0.4} />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => fmtDate(v)}
                fontSize={11}
                stroke={c.inkMuted}
                tick={{ fill: c.inkMuted, fontFamily: 'JetBrains Mono, monospace' }}
              />
              <YAxis
                tickFormatter={(v) => fmtUsd(v)}
                fontSize={11}
                width={70}
                stroke={c.inkMuted}
                tick={{ fill: c.inkMuted, fontFamily: 'JetBrains Mono, monospace' }}
              />
              <Tooltip
                formatter={(v) => fmtUsd(Number(v))}
                labelFormatter={(v) => fmtDate(v as string)}
                contentStyle={{
                  background: c.paper,
                  border: `1px solid ${c.edge}`,
                  borderRadius: '6px 8px 5px 7px',
                  fontFamily: 'EB Garamond, serif',
                  color: c.ink,
                }}
                labelStyle={{ color: c.inkMuted, fontStyle: 'italic' }}
              />
              <Area
                type="monotone"
                dataKey="total_value"
                stroke={c.teal}
                strokeWidth={2}
                fill="url(#pv)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
