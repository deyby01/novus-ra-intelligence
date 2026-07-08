export interface Dashboard {
  id: string
  name: string
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type ChartType = 'line' | 'bar' | 'pie' | 'kpi' | 'table'
export type AggregationFunction = 'count' | 'sum' | 'avg' | 'min' | 'max'

export interface WidgetConfig {
  agg: AggregationFunction
  metric?: string
  group_by?: string
}

export interface WidgetPosition {
  x?: number
  y?: number
  w?: number
  h?: number
}

export interface Widget {
  id: string
  dashboard: string
  dataset: string
  chart_type: ChartType
  config: WidgetConfig
  position: WidgetPosition | null
  created_at: string
  updated_at: string
}

export interface AggregationQuery {
  datasetId: string
  agg: AggregationFunction
  metric?: string
  group_by?: string
}

export interface AggregationResultEntry {
  group: string | null
  value: number | null
}

export interface AggregationResult {
  aggregation: string
  metric: string | null
  group_by: string | null
  results: AggregationResultEntry[]
}
