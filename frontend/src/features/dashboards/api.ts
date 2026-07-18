import { apiClient } from '@/lib/api-client'
import type { Paginated } from '@/lib/api-types'
import type { Dashboard } from './types'

/** Fetch the current workspace's dashboards (the active org flows via the header). */
export async function getDashboards(): Promise<Dashboard[]> {
  const { data } = await apiClient.get<Paginated<Dashboard>>('/dashboards/')
  return data.results
}

/** Fetch a single dashboard by id (scoped to the active workspace). */
export async function getDashboard(id: string): Promise<Dashboard> {
  const { data } = await apiClient.get<Dashboard>(`/dashboards/${id}/`)
  return data
}

interface CreateDashboardInput {
  name: string
}

/** Create a dashboard in the active workspace. */
export async function createDashboard(
  input: CreateDashboardInput,
): Promise<Dashboard> {
  const { data } = await apiClient.post<Dashboard>('/dashboards/', input)
  return data
}

/** Rename (or otherwise patch) a dashboard. */
export async function updateDashboard(
  id: string,
  input: Partial<CreateDashboardInput>,
): Promise<Dashboard> {
  const { data } = await apiClient.patch<Dashboard>(`/dashboards/${id}/`, input)
  return data
}

/** Duplicate a dashboard and all its widgets; returns the new dashboard. */
export async function duplicateDashboard(id: string): Promise<Dashboard> {
  const { data } = await apiClient.post<Dashboard>(
    `/dashboards/${id}/duplicate/`,
  )
  return data
}

/** Generate a dashboard from a dataset (AI names it); returns the new dashboard. */
export async function generateDashboard(datasetId: string): Promise<Dashboard> {
  const { data } = await apiClient.post<Dashboard>('/dashboards/generate/', {
    dataset: datasetId,
  })
  return data
}

/** Delete a dashboard. */
export async function deleteDashboard(id: string): Promise<void> {
  await apiClient.delete(`/dashboards/${id}/`)
}

import type {
  AggregationQuery,
  AggregationResult,
  ChartType,
  Widget,
  WidgetConfig,
  WidgetPosition,
} from './types'

export async function getWidgets(dashboardId: string): Promise<Widget[]> {
  const { data } = await apiClient.get<Paginated<Widget>>(
    `/widgets/?dashboard=${dashboardId}`,
  )
  return data.results
}

export interface CreateWidgetInput {
  dashboard: string
  dataset: string
  chart_type: ChartType
  config: WidgetConfig
  position?: WidgetPosition | null
}

export async function createWidget(input: CreateWidgetInput): Promise<Widget> {
  const { data } = await apiClient.post<Widget>('/widgets/', input)
  return data
}

export async function updateWidget(
  id: string,
  input: Partial<CreateWidgetInput>,
): Promise<Widget> {
  const { data } = await apiClient.patch<Widget>(`/widgets/${id}/`, input)
  return data
}

export async function deleteWidget(id: string): Promise<void> {
  await apiClient.delete(`/widgets/${id}/`)
}

export async function getDatasetAggregation(
  query: AggregationQuery,
): Promise<AggregationResult> {
  const params = new URLSearchParams()
  params.append('agg', query.agg)
  if (query.metric) params.append('metric', query.metric)
  if (query.group_by) params.append('group_by', query.group_by)
  if (query.bucket) params.append('bucket', query.bucket)

  const { data } = await apiClient.get<AggregationResult>(
    `/datasets/${query.datasetId}/aggregate/?${params.toString()}`,
  )
  return data
}
