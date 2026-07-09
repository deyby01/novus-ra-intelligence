export type ReportStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export interface Report {
  id: string
  dataset: string
  status: ReportStatus
  content: string
  error_message: string
  created_at: string
  updated_at: string
}

export interface CreateReportPayload {
  dataset: string
}
