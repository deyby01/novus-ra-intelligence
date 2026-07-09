import { apiClient } from '@/lib/api-client'
import type { CreateReportPayload, Report } from './types'

export const reportsApi = {
  list: async (datasetId: string) => {
    // We fetch reports from the dataset reports nested route if available,
    // or we just fetch from /reports/ and filter by dataset if the backend supports it.
    // Wait, the backend has /api/v1/reports/. We can filter there, or we can just get all and filter in frontend for now.
    // Actually, getting all reports for the user/org is what the backend does.
    const { data } = await apiClient.get<any>('/reports/')
    const results: Report[] = data.results || data
    return results.filter((r: Report) => r.dataset === datasetId)
  },

  retrieve: async (id: string) => {
    const { data } = await apiClient.get<Report>(`/reports/${id}/`)
    return data
  },

  create: async (payload: CreateReportPayload) => {
    const { data } = await apiClient.post<Report>('/reports/', payload)
    return data
  },
}
