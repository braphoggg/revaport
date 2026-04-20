export type TxType = 'BUY' | 'SELL' | 'DIVIDEND' | 'SPLIT'

export interface Holding {
  id: number
  ticker: string
  qty: number
  total_cost: number
  realized_pnl: number
  notes: string | null
  created_at: string
  updated_at: string
  avg_cost: number
  current_price: number | null
  prev_close: number | null
  market_value: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
  day_change: number
  day_change_pct: number
  price_as_of: string | null
  price_stale: boolean
}

export interface Transaction {
  id: number
  ticker: string
  tx_type: TxType
  qty: number
  price: number
  fees: number
  executed_at: string
  notes: string | null
  created_at: string
}

export interface Price {
  ticker: string
  price: number
  prev_close: number | null
  as_of: string
  stale: boolean
}

export interface PriceHistoryPoint {
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
}

export interface PortfolioAllocation {
  ticker: string
  market_value: number
  weight_pct: number
}

export interface PortfolioSummary {
  total_value: number
  total_cost: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
  day_change: number
  day_change_pct: number
  realized_pnl: number
  positions: number
  allocations: PortfolioAllocation[]
}

export interface PortfolioHistoryPoint {
  date: string
  total_value: number
  total_cost: number
  unrealized_pnl: number
  realized_pnl_cumulative: number
}
