import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { PriceStreamProvider } from '@/hooks/PriceStreamProvider'
import { Shell } from '@/components/layout/Shell'
import Dashboard from '@/pages/Dashboard'
import Holdings from '@/pages/Holdings'
import Transactions from '@/pages/Transactions'
import TickerDetail from '@/pages/TickerDetail'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PriceStreamProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Dashboard />} />
              <Route path="holdings" element={<Holdings />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="ticker/:symbol" element={<TickerDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PriceStreamProvider>
    </QueryClientProvider>
  )
}
