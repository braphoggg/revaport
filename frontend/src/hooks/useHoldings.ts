import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { holdingsApi, type CreateHoldingInput, type UpdateHoldingInput } from '@/api/holdings'

export function useHoldings() {
  return useQuery({ queryKey: ['holdings'], queryFn: holdingsApi.list })
}

export function useCreateHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateHoldingInput) => holdingsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holdings'] })
      qc.invalidateQueries({ queryKey: ['portfolio', 'summary'] })
    },
  })
}

export function useUpdateHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateHoldingInput }) => holdingsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  })
}

export function useDeleteHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => holdingsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holdings'] })
      qc.invalidateQueries({ queryKey: ['portfolio', 'summary'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
