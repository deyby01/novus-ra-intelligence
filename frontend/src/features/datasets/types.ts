export type DatasetSource = 'excel' | 'manual'

export interface Dataset {
  id: string
  name: string
  description: string
  source: DatasetSource
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
