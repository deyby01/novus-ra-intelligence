import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import {
  createDashboard,
  deleteDashboard,
  getDashboard,
  getDashboards,
} from './api'

/**
 * Query the active workspace's dashboards. Keyed by the organization id so
 * switching workspaces refetches instead of showing another tenant's cache.
 */
export function useDashboards() {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))
  const organizationId = useWorkspaceStore(
    (state) => state.currentOrganizationId,
  )
  return useQuery({
    queryKey: ['dashboards', organizationId],
    queryFn: getDashboards,
    enabled: isAuthenticated && Boolean(organizationId),
  })
}

/** Whether a workspace-scoped query is allowed to run: authenticated + an org + a target. */
function useTenantQueryEnabled(id: string): boolean {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))
  const organizationId = useWorkspaceStore(
    (state) => state.currentOrganizationId,
  )
  return isAuthenticated && Boolean(organizationId) && Boolean(id)
}

function useOrganizationId(): string | null {
  return useWorkspaceStore((state) => state.currentOrganizationId)
}

/** Fetch a single dashboard, keyed by the active organization. */
export function useDashboard(id: string) {
  const organizationId = useOrganizationId()
  return useQuery({
    queryKey: ['dashboard', organizationId, id],
    queryFn: () => getDashboard(id),
    enabled: useTenantQueryEnabled(id),
  })
}

/** Mutations that add and remove dashboards, refreshing the workspace's list. */
export function useDashboardMutations() {
  const queryClient = useQueryClient()
  const organizationId = useOrganizationId()
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['dashboards', organizationId],
    })

  const create = useMutation({
    mutationFn: (input: { name: string }) => createDashboard(input),
    onSuccess: () => void invalidate(),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteDashboard(id),
    onSuccess: () => void invalidate(),
  })

  return { create, remove }
}

import {
  createWidget,
  deleteWidget,
  getDatasetAggregation,
  getWidgets,
  updateWidget,
} from './api'
import type { AggregationQuery } from './types'

export function useWidgets(dashboardId: string) {
  const organizationId = useOrganizationId()
  return useQuery({
    queryKey: ['widgets', organizationId, dashboardId],
    queryFn: () => getWidgets(dashboardId),
    enabled: useTenantQueryEnabled(dashboardId),
  })
}

export function useWidgetMutations(dashboardId: string) {
  const queryClient = useQueryClient()
  const organizationId = useOrganizationId()
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['widgets', organizationId, dashboardId],
    })

  const create = useMutation({
    mutationFn: createWidget,
    onSuccess: () => void invalidate(),
  })
  const update = useMutation({
    mutationFn: ({
      id,
      ...input
    }: { id: string } & Parameters<typeof updateWidget>[1]) =>
      updateWidget(id, input),
    onSuccess: () => void invalidate(),
  })
  const remove = useMutation({
    mutationFn: deleteWidget,
    onSuccess: () => void invalidate(),
  })

  return { create, update, remove }
}

export function useDatasetAggregation(query: AggregationQuery) {
  const organizationId = useOrganizationId()
  return useQuery({
    queryKey: [
      'aggregation',
      organizationId,
      query.datasetId,
      query.agg,
      query.metric,
      query.group_by,
    ],
    queryFn: () => getDatasetAggregation(query),
    enabled: useTenantQueryEnabled(query.datasetId),
  })
}
