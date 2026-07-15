import type {
  AggregationFunction,
  AggregationResult,
  ChartType,
  WidgetSize,
} from '@/features/dashboards/types'

export type DatasetSource = 'excel' | 'manual'

export interface Dataset {
  id: string
  name: string
  description: string
  source: DatasetSource
  /** Rows the dataset holds, annotated by the API. */
  row_count: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'select'

export interface DatasetField {
  id: string
  dataset: string
  key: string
  label: string
  field_type: FieldType
  order: number
}

/** A row's dynamic JSON document, keyed by each field's `key`. */
export type RowData = Record<string, unknown>

export interface DatasetRow {
  id: string
  dataset: string
  data: RowData
  created_at: string
  updated_at: string
}

export type ImportJobStatus = 'pending' | 'processing' | 'done' | 'error'

export interface ImportJob {
  id: string
  dataset: string
  status: ImportJobStatus
  rows_processed: number
  errors: { detail?: string }
  created_at: string
  updated_at: string
}

/** Top-line counts describing a dataset's shape at overview-generation time. */
export interface OverviewHeadline {
  row_count: number
  field_count: number
  numeric_field_count: number
  generated_at: string
}

/** The chart config the backend chose for an auto-generated overview widget. */
export interface OverviewWidgetConfig {
  agg: AggregationFunction
  metric: string | null
  group_by: string | null
  title: string
  size: WidgetSize
  bucket?: 'month'
}

/** A single overview widget: an aggregation result plus how to chart it. */
export interface OverviewWidget extends AggregationResult {
  chart_type: ChartType
  config: OverviewWidgetConfig
}

/** An ephemeral, backend-computed overview of a dataset (KPIs + charts). */
export interface DatasetOverview {
  headline: OverviewHeadline
  widgets: OverviewWidget[]
}
