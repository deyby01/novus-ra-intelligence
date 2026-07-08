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
