import { api } from '@/lib/api'
import type { CreateReportPayload, Report } from './types'

export const reportsApi = {
  list: async (datasetId: string) => {
    // We fetch reports from the dataset reports nested route if available,
    // or we just fetch from /reports/ and filter by dataset if the backend supports it.
    // Wait, the backend has /api/v1/reports/. We can filter there, or we can just get all and filter in frontend for now.
    // Actually, getting all reports for the user/org is what the backend does.
    const { data } = await api.get<Report[]>('/reports/')
    // Simple filter by dataset ID for now, in a real app backend should accept ?dataset=X
    return data.filter((r) => r.dataset === datasetId)
  },

  retrieve: async (id: string) => {
    const { data } = await api.get<Report>(`/reports/${id}/`)
    return data
  },

  create: async (payload: CreateReportPayload) => {
    const { data } = await api.post<Report>('/reports/', payload)
    return data
  },
}
