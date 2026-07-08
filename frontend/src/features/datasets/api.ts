import { apiClient } from '@/lib/api-client'
import type { Paginated } from '@/lib/api-types'
import type { Dataset } from './types'

/** Fetch the current workspace's datasets (the active org flows via the header). */
export async function getDatasets(): Promise<Dataset[]> {
  const { data } = await apiClient.get<Paginated<Dataset>>('/datasets/')
  return data.results
}
