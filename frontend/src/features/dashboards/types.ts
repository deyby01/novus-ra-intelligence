export type ChartType = 'line' | 'bar' | 'pie' | 'kpi' | 'table'

export interface Dashboard {
  id: string
  name: string
  /** Optional summary; the AI writes one when it generates the dashboard. */
  description: string
  /** Chart types of the dashboard's widgets, in order — drives the card preview. */
  widget_types: ChartType[]
  /** Distinct dataset ids the dashboard's widgets connect to. */
  dataset_ids: string[]
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}
export type AggregationFunction = 'count' | 'sum' | 'avg' | 'min' | 'max'
export type WidgetSize = 'small' | 'medium' | 'large'

export interface WidgetConfig {
  agg: AggregationFunction
  metric?: string
  group_by?: string
  title?: string
  size?: WidgetSize
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
  /** Group a date `group_by` field by its "YYYY-MM" prefix (for a trend). */
  bucket?: 'month'
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
