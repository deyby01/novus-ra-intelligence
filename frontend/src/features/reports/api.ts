import { apiClient } from '@/lib/api-client'
import type { Paginated } from '@/lib/api-types'
import type { CreateReportPayload, Report } from './types'

export const reportsApi = {
  list: async (datasetId: string): Promise<Report[]> => {
    const { data } = await apiClient.get<Paginated<Report>>('/reports/', {
      params: { dataset: datasetId },
    })
    return data.results
  },

  retrieve: async (id: string): Promise<Report> => {
    const { data } = await apiClient.get<Report>(`/reports/${id}/`)
    return data
  },

  create: async (payload: CreateReportPayload): Promise<Report> => {
    const { data } = await apiClient.post<Report>('/reports/', payload)
    return data
  },

  downloadPdf: async (id: string): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`/reports/${id}/pdf/`, {
      responseType: 'blob',
    })
    return data
  },
}
