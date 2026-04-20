import { api, apiUpload } from './client'
import type { Transaction, TxType } from '@/types/api'

export interface CreateTransactionInput {
  ticker: string
  tx_type: TxType
  qty: number
  price: number
  fees?: number
  executed_at: string
  notes?: string | null
}

export interface UpdateTransactionInput {
  ticker?: string
  tx_type?: TxType
  qty?: number
  price?: number
  fees?: number
  executed_at?: string
  notes?: string | null
}

export interface ListTransactionsParams {
  ticker?: string
  start?: string
  end?: string
}

export interface InjectedSplit {
  ticker: string
  date: string
  ratio: number
}

export interface ImportResult {
  ok: boolean
  rows: number
  errors: string[]
  preview?: Array<Record<string, unknown>>
  tickers?: string[]
  splits_injected?: InjectedSplit[]
}

export const transactionsApi = {
  list: (params: ListTransactionsParams = {}) => {
    const q = new URLSearchParams()
    if (params.ticker) q.set('ticker', params.ticker)
    if (params.start) q.set('start', params.start)
    if (params.end) q.set('end', params.end)
    const qs = q.toString()
    return api<Transaction[]>(`/api/transactions${qs ? '?' + qs : ''}`)
  },
  create: (body: CreateTransactionInput) =>
    api<Transaction>('/api/transactions', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: UpdateTransactionInput) =>
    api<Transaction>(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: number) =>
    api<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
  importCsv: (file: File, commit: boolean) => {
    const fd = new FormData()
    fd.append('file', file)
    return apiUpload<ImportResult>(`/api/transactions/import?commit=${commit}`, fd)
  },
}
