import { apiClient } from '@/lib/api-client'
import type { Paginated } from '@/lib/api-types'
import type { Dataset, DatasetSource, ImportJob } from './types'

/** Fetch the current workspace's datasets (the active org flows via the header). */
export async function getDatasets(): Promise<Dataset[]> {
  const { data } = await apiClient.get<Paginated<Dataset>>('/datasets/')
  return data.results
}

interface CreateDatasetInput {
  name: string
  description?: string
  source?: DatasetSource
}

/** Create a dataset in the active workspace. */
export async function createDataset(
  input: CreateDatasetInput,
): Promise<Dataset> {
  const { data } = await apiClient.post<Dataset>('/datasets/', input)
  return data
}

/** Upload an Excel file to import into a dataset; returns the queued job. */
export async function createImportJob(
  datasetId: string,
  file: File,
): Promise<ImportJob> {
  const form = new FormData()
  form.append('dataset', datasetId)
  form.append('file', file)
  const { data } = await apiClient.post<ImportJob>('/import-jobs/', form)
  return data
}

/** Fetch a single import job to poll its status. */
export async function getImportJob(id: string): Promise<ImportJob> {
  const { data } = await apiClient.get<ImportJob>(`/import-jobs/${id}/`)
  return data
}
