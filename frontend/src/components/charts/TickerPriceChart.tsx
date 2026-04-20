import { useState } from 'react'
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { usePriceHistory } from '@/hooks/usePortfolio'
import { fmtAxisDate, fmtDate, fmtUsd } from '@/lib/format'
import { useChartPalette } from './chartTheme'

const RANGES = ['1M', '3M', '1Y', '5Y', 'MAX'] as const
type Range = (typeof RANGES)[number]

export function TickerPriceChart({ ticker }: { ticker: string }) {
  const [range, setRange] = useState<Range>('1M')
  const { data, isLoading } = usePriceHistory(ticker, range)
  const c = useChartPalette()

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display italic text-base text-ink tracking-wide">
          {ticker} <span className="text-ink-muted not-italic">— close price</span>
        </h3>
        <div className="flex gap-1 text-xs">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={
                'px-2 py-0.5 rounded-paper-sm font-display tracking-wider transition-colors ' +
                (r === range
                  ? 'bg-umber text-paper'
                  : 'text-ink-muted hover:text-ink')
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-xs text-ink-muted italic animate-pulse-flicker">loading…</div>
        ) : !data || data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-ink-muted italic">No data.</div>
        ) : (
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <defs>
                <linearGradient id="tp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.umber} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={c.umber} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={c.edge} strokeDasharray="2 4" opacity={0.4} />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => fmtAxisDate(v, range)}
                fontSize={11}
                stroke={c.inkMuted}
                tick={{ fill: c.inkMuted, fontFamily: 'JetBrains Mono, monospace' }}
                minTickGap={48}
              />
              <YAxis
                domain={['auto', 'auto']}
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
                dataKey="close"
                stroke={c.umber}
                strokeWidth={2}
                fill="url(#tp)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
