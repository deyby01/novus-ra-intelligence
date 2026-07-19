import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import {
  createDashboard,
  deleteDashboard,
  duplicateDashboard,
  generateDashboard,
  getDashboard,
  getDashboards,
  updateDashboard,
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
  const update = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateDashboard(id, { name }),
    onSuccess: () => void invalidate(),
  })
  const duplicate = useMutation({
    mutationFn: (id: string) => duplicateDashboard(id),
    onSuccess: () => void invalidate(),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteDashboard(id),
    onSuccess: () => void invalidate(),
  })

  return { create, update, duplicate, remove }
}

/** Generate a dashboard from a dataset with the AI; refreshes the list. */
export function useGenerateDashboard() {
  const queryClient = useQueryClient()
  const organizationId = useOrganizationId()
  return useMutation({
    mutationFn: (datasetId: string) => generateDashboard(datasetId),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['dashboards', organizationId],
      }),
  })
}

import { useDatasetFields } from '@/features/datasets/hooks'
import {
  createWidget,
  deleteWidget,
  getDatasetAggregation,
  getWidgets,
  reorderWidgets,
  updateWidget,
} from './api'
import type { AggregationQuery, Widget } from './types'

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

/**
 * Persist a widget's new grid span. Updates the widgets cache optimistically so
 * the card holds its new size the instant the drag ends, then PATCHes the
 * position; the mutation's invalidation reconciles with the server.
 */
export function useResizeWidget(dashboardId: string) {
  const queryClient = useQueryClient()
  const organizationId = useOrganizationId()
  const { update } = useWidgetMutations(dashboardId)
  return (widget: Widget, span: { w: number; h: number }) => {
    const position = { ...(widget.position ?? {}), ...span }
    queryClient.setQueryData<Widget[]>(
      ['widgets', organizationId, dashboardId],
      (old) =>
        old?.map((item) =>
          item.id === widget.id ? { ...item, position } : item,
        ),
    )
    update.mutate({ id: widget.id, position })
  }
}

/**
 * Persist a new widget order via drag-to-reorder. Reorders the cache
 * optimistically (so the grid holds the drop instantly) and rolls back if the
 * request fails.
 */
export function useReorderWidgets(dashboardId: string) {
  const queryClient = useQueryClient()
  const organizationId = useOrganizationId()
  const key = ['widgets', organizationId, dashboardId]
  return useMutation({
    mutationFn: (widgetIds: string[]) => reorderWidgets(dashboardId, widgetIds),
    onMutate: (widgetIds: string[]) => {
      const previous = queryClient.getQueryData<Widget[]>(key)
      if (previous) {
        const byId = new Map(previous.map((widget) => [widget.id, widget]))
        const next = widgetIds
          .map((id) => byId.get(id))
          .filter((widget): widget is Widget => widget !== undefined)
        queryClient.setQueryData<Widget[]>(key, next)
      }
      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useDatasetAggregation(
  query: AggregationQuery,
  options?: { enabled?: boolean },
) {
  const organizationId = useOrganizationId()
  const tenantEnabled = useTenantQueryEnabled(query.datasetId)
  return useQuery({
    queryKey: [
      'aggregation',
      organizationId,
      query.datasetId,
      query.agg,
      query.metric,
      query.group_by,
      query.bucket,
    ],
    queryFn: () => getDatasetAggregation(query),
    enabled: tenantEnabled && (options?.enabled ?? true),
  })
}

/**
 * A KPI's measure bucketed by month, for a sparkline — but only when the
 * dataset has a date field to trend over. When it has none the query stays
 * disabled and `hasTrend` is false, so the caller renders just the number.
 */
export function useKpiTrend(widget: Widget) {
  const { data: fields } = useDatasetFields(widget.dataset)
  const dateField = fields?.find((field) => field.field_type === 'date')
  const enabled = Boolean(dateField) && Boolean(widget.config.agg)
  const query = useDatasetAggregation(
    {
      datasetId: widget.dataset,
      agg: widget.config.agg,
      metric: widget.config.metric,
      group_by: dateField?.key,
      bucket: 'month',
    },
    { enabled },
  )
  return { hasTrend: enabled, ...query }
}
