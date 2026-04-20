import { api } from './client'
import type { PortfolioHistoryPoint, PortfolioSummary } from '@/types/api'

export const portfolioApi = {
  summary: () => api<PortfolioSummary>('/api/portfolio/summary'),
  history: (range: string) =>
    api<PortfolioHistoryPoint[]>(`/api/portfolio/history?range=${range}`),
}
