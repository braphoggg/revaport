import { api } from './client'
import type { Holding } from '@/types/api'

export interface CreateHoldingInput {
  ticker: string
  notes?: string | null
}

export interface UpdateHoldingInput {
  notes?: string | null
}

export const holdingsApi = {
  list: () => api<Holding[]>('/api/holdings'),
  create: (body: CreateHoldingInput) =>
    api<Holding>('/api/holdings', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: UpdateHoldingInput) =>
    api<Holding>(`/api/holdings/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: number) =>
    api<void>(`/api/holdings/${id}`, { method: 'DELETE' }),
}
