import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from './api'
import type { CreateReportPayload } from './types'

export const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: (datasetId: string) => [...reportKeys.lists(), datasetId] as const,
  details: () => [...reportKeys.all, 'detail'] as const,
  detail: (id: string) => [...reportKeys.details(), id] as const,
}

export function useReports(datasetId: string) {
  return useQuery({
    queryKey: reportKeys.list(datasetId),
    queryFn: () => reportsApi.list(datasetId),
    enabled: Boolean(datasetId),
  })
}

export function useReport(id: string, options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: () => reportsApi.retrieve(id),
    enabled: Boolean(id),
    refetchInterval: options?.refetchInterval,
  })
}

export function useReportMutations(datasetId: string) {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: (payload: CreateReportPayload) => reportsApi.create(payload),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.list(datasetId) })
      queryClient.setQueryData(reportKeys.detail(newReport.id), newReport)
    },
  })

  return { create }
}
