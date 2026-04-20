import { useQuery } from '@tanstack/react-query'
import { portfolioApi } from '@/api/portfolio'
import { pricesApi } from '@/api/prices'

export function usePortfolioSummary() {
  return useQuery({
    queryKey: ['portfolio', 'summary'],
    queryFn: portfolioApi.summary,
  })
}

export function usePortfolioHistory(range: string) {
  return useQuery({
    queryKey: ['portfolio', 'history', range],
    queryFn: () => portfolioApi.history(range),
  })
}

export function usePriceHistory(ticker: string, range: string) {
  return useQuery({
    queryKey: ['prices', 'history', ticker, range],
    queryFn: () => pricesApi.history(ticker, range),
    enabled: Boolean(ticker),
  })
}
