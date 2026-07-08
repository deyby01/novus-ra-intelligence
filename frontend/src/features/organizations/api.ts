import { apiClient } from '@/lib/api-client'
import type { Paginated } from '@/lib/api-types'
import type { Membership } from './types'

/** Fetch the current user's active workspaces (the org-picker source). */
export async function getMemberships(): Promise<Membership[]> {
  const { data } = await apiClient.get<Paginated<Membership>>('/memberships/')
  return data.results
}
