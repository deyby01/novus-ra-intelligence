export type ReportStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export interface Report {
  id: string
  dataset: string
  /** The dataset's name, so a report is readable outside its dataset page. */
  dataset_name: string
  status: ReportStatus
  content: string
  error_message: string
  created_at: string
  updated_at: string
}

export interface CreateReportPayload {
  dataset: string
}
