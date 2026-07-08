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
