import { api } from './client'
import type { Price, PriceHistoryPoint } from '@/types/api'

export const pricesApi = {
  list: (tickers: string[]) =>
    tickers.length === 0
      ? Promise.resolve<Price[]>([])
      : api<Price[]>(`/api/prices?tickers=${encodeURIComponent(tickers.join(','))}`),
  history: (ticker: string, range: string) =>
    api<PriceHistoryPoint[]>(`/api/prices/history/${encodeURIComponent(ticker)}?range=${range}`),
  validate: (ticker: string) =>
    api<{ ticker: string; ok: boolean }>(`/api/prices/validate/${encodeURIComponent(ticker)}`),
}
