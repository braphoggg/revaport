import { createContext, useContext, type ReactNode } from 'react'
import { usePriceStream, type StreamState } from './usePriceStream'

interface PriceStreamContextValue {
  state: StreamState
  lastEventAt: number | null
}

const PriceStreamContext = createContext<PriceStreamContextValue>({
  state: 'connecting',
  lastEventAt: null,
})

export function PriceStreamProvider({ children }: { children: ReactNode }) {
  const value = usePriceStream()
  return <PriceStreamContext.Provider value={value}>{children}</PriceStreamContext.Provider>
}

export function usePriceStreamState() {
  return useContext(PriceStreamContext)
}
