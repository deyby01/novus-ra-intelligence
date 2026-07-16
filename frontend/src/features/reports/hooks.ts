import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { reportsApi } from './api'
import type { CreateReportPayload, Report } from './types'

export const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: (organizationId: string | null, datasetId: string) =>
    [...reportKeys.lists(), organizationId, datasetId] as const,
  recent: (organizationId: string | null, limit: number) =>
    [...reportKeys.lists(), 'recent', organizationId, limit] as const,
  details: () => [...reportKeys.all, 'detail'] as const,
  detail: (organizationId: string | null, id: string) =>
    [...reportKeys.details(), organizationId, id] as const,
}

/**
 * The workspace's latest reports across datasets (the Home), keyed by the
 * active organization. Polls while any report is still being generated so a
 * freshly requested one flips to its final state on its own.
 */
export function useRecentReports(limit: number) {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))
  const organizationId = useWorkspaceStore(
    (state) => state.currentOrganizationId,
  )
  return useQuery({
    queryKey: reportKeys.recent(organizationId, limit),
    queryFn: () => reportsApi.listRecent(limit),
    enabled: isAuthenticated && Boolean(organizationId),
    refetchInterval: (query) =>
      query.state.data?.some((report) => report.status === 'PENDING')
        ? 2500
        : false,
  })
}

/** Request a report for any dataset from the Home, refreshing the recent list. */
export function useGenerateReport(limit: number) {
  const queryClient = useQueryClient()
  const organizationId = useWorkspaceStore(
    (state) => state.currentOrganizationId,
  )
  return useMutation({
    mutationFn: (payload: CreateReportPayload) => reportsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: reportKeys.recent(organizationId, limit),
      })
    },
  })
}

/** List a dataset's reports, keyed by the active organization. */
export function useReports(datasetId: string) {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))
  const organizationId = useWorkspaceStore(
    (state) => state.currentOrganizationId,
  )
  return useQuery({
    queryKey: reportKeys.list(organizationId, datasetId),
    queryFn: () => reportsApi.list(datasetId),
    enabled: isAuthenticated && Boolean(organizationId) && Boolean(datasetId),
  })
}

/** Fetch a single report, keyed by the active organization; supports polling. */
export function useReport(
  id: string,
  options?: Partial<UseQueryOptions<Report, Error, Report>>,
): UseQueryResult<Report, Error> {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))
  const organizationId = useWorkspaceStore(
    (state) => state.currentOrganizationId,
  )
  return useQuery({
    queryKey: reportKeys.detail(organizationId, id),
    queryFn: () => reportsApi.retrieve(id),
    enabled: isAuthenticated && Boolean(organizationId) && Boolean(id),
    ...options,
  })
}

/** Request a new report, refreshing the org-scoped list cache on success. */
export function useReportMutations(datasetId: string) {
  const queryClient = useQueryClient()
  const organizationId = useWorkspaceStore(
    (state) => state.currentOrganizationId,
  )

  const create = useMutation({
    mutationFn: (payload: CreateReportPayload) => reportsApi.create(payload),
    onSuccess: (newReport) => {
      void queryClient.invalidateQueries({
        queryKey: reportKeys.list(organizationId, datasetId),
      })
      queryClient.setQueryData(
        reportKeys.detail(organizationId, newReport.id),
        newReport,
      )
    },
  })

  return { create }
}
