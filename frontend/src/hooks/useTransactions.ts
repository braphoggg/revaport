import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  transactionsApi,
  type CreateTransactionInput,
  type ListTransactionsParams,
  type UpdateTransactionInput,
} from '@/api/transactions'

export function useTransactions(params: ListTransactionsParams = {}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => transactionsApi.list(params),
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['transactions'] })
  qc.invalidateQueries({ queryKey: ['holdings'] })
  qc.invalidateQueries({ queryKey: ['portfolio', 'summary'] })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => transactionsApi.create(input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateTransactionInput }) => transactionsApi.update(id, body),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => transactionsApi.remove(id),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useImportTransactions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, commit }: { file: File; commit: boolean }) => transactionsApi.importCsv(file, commit),
    onSuccess: (_, vars) => {
      if (vars.commit) invalidateAll(qc)
    },
  })
}
