import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Price } from '@/types/api'

export type StreamState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

interface PriceEvent {
  ticker: string
  price: number
  prev_close: number | null
  as_of: string
  stale: boolean
}

const STREAM_URL = '/api/stream/prices'

export function usePriceStream() {
  const qc = useQueryClient()
  const [state, setState] = useState<StreamState>('connecting')
  const [lastEventAt, setLastEventAt] = useState<number | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const refetchTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let closed = false

    const scheduleRefetch = () => {
      if (refetchTimerRef.current !== null) return
      refetchTimerRef.current = window.setTimeout(() => {
        refetchTimerRef.current = null
        qc.invalidateQueries({ queryKey: ['holdings'] })
        qc.invalidateQueries({ queryKey: ['portfolio', 'summary'] })
      }, 250)
    }

    const connect = () => {
      if (closed) return
      setState((prev) => (prev === 'disconnected' ? 'reconnecting' : prev === 'connected' ? 'reconnecting' : 'connecting'))
      const es = new EventSource(STREAM_URL)
      esRef.current = es

      es.addEventListener('open', () => {
        if (closed) return
        setState('connected')
      })

      es.addEventListener('price', (ev) => {
        if (closed) return
        setLastEventAt(Date.now())
        try {
          const payload = JSON.parse((ev as MessageEvent).data) as PriceEvent
          qc.setQueryData<Record<string, Price>>(['prices', 'live'], (prev) => ({
            ...(prev ?? {}),
            [payload.ticker]: {
              ticker: payload.ticker,
              price: payload.price,
              prev_close: payload.prev_close,
              as_of: payload.as_of,
              stale: payload.stale,
            },
          }))
          scheduleRefetch()
        } catch {
          // ignore malformed payloads
        }
      })

      es.addEventListener('ping', () => {
        if (closed) return
        setLastEventAt(Date.now())
      })

      es.addEventListener('error', () => {
        if (closed) return
        setState('reconnecting')
        es.close()
        esRef.current = null
        window.setTimeout(connect, 2000)
      })
    }

    connect()

    return () => {
      closed = true
      setState('disconnected')
      if (refetchTimerRef.current !== null) {
        window.clearTimeout(refetchTimerRef.current)
        refetchTimerRef.current = null
      }
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [qc])

  return { state, lastEventAt }
}

export function useLivePrice(ticker: string): Price | undefined {
  const qc = useQueryClient()
  const map = qc.getQueryData<Record<string, Price>>(['prices', 'live'])
  return map?.[ticker]
}
