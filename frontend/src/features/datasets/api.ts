import { apiClient } from '@/lib/api-client'
import type { Paginated } from '@/lib/api-types'
import type {
  Dataset,
  DatasetField,
  DatasetOverview,
  DatasetRow,
  DatasetSource,
  ImportJob,
  RowData,
} from './types'

/** Fetch the current workspace's datasets (the active org flows via the header). */
export async function getDatasets(): Promise<Dataset[]> {
  const { data } = await apiClient.get<Paginated<Dataset>>('/datasets/')
  return data.results
}

/** Fetch a single dataset by id (scoped to the active workspace). */
export async function getDataset(id: string): Promise<Dataset> {
  const { data } = await apiClient.get<Dataset>(`/datasets/${id}/`)
  return data
}

/** Fetch a dataset's ephemeral overview (headline counts + auto-built widgets). */
export async function getDatasetOverview(id: string): Promise<DatasetOverview> {
  const { data } = await apiClient.get<DatasetOverview>(
    `/datasets/${id}/overview/`,
  )
  return data
}

/** Fetch a dataset's column definitions, ordered as the user arranged them. */
export async function getDatasetFields(
  datasetId: string,
): Promise<DatasetField[]> {
  const { data } = await apiClient.get<Paginated<DatasetField>>(
    '/dataset-fields/',
    { params: { dataset: datasetId, ordering: 'order' } },
  )
  return data.results
}

/** Fetch the first page of a dataset's rows, keeping the total count. */
export async function getDatasetRows(
  datasetId: string,
): Promise<Paginated<DatasetRow>> {
  const { data } = await apiClient.get<Paginated<DatasetRow>>(
    '/dataset-rows/',
    {
      params: { dataset: datasetId },
    },
  )
  return data
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

/** Append a row to a dataset with a JSON document keyed by field key. */
export async function createDatasetRow(
  datasetId: string,
  values: RowData,
): Promise<DatasetRow> {
  const { data } = await apiClient.post<DatasetRow>('/dataset-rows/', {
    dataset: datasetId,
    data: values,
  })
  return data
}

/** Replace a row's data document. */
export async function updateDatasetRow(
  id: string,
  values: RowData,
): Promise<DatasetRow> {
  const { data } = await apiClient.patch<DatasetRow>(`/dataset-rows/${id}/`, {
    data: values,
  })
  return data
}

/** Delete a row. */
export async function deleteDatasetRow(id: string): Promise<void> {
  await apiClient.delete(`/dataset-rows/${id}/`)
}
