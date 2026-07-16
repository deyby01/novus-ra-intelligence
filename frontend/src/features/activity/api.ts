import { apiClient } from '@/lib/api-client'
import type { Paginated } from '@/lib/api-types'
import type { ActivityEvent } from './types'

export const activityApi = {
  /**
   * The workspace's latest activity events. The API applies the ordering, so
   * taking the first `limit` yields the newest.
   */
  listRecent: async (limit: number): Promise<ActivityEvent[]> => {
    const { data } = await apiClient.get<Paginated<ActivityEvent>>(
      '/activity/',
      {
        params: { ordering: '-created_at' },
      },
    )
    return data.results.slice(0, limit)
  },
}
