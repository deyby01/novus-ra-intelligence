import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { activityApi } from './api'

export const activityKeys = {
  all: ['activity'] as const,
  recent: (organizationId: string | null, limit: number) =>
    [...activityKeys.all, 'recent', organizationId, limit] as const,
}

/** The workspace's latest activity events (the Home), keyed by organization. */
export function useRecentActivity(limit: number) {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))
  const organizationId = useWorkspaceStore(
    (state) => state.currentOrganizationId,
  )
  return useQuery({
    queryKey: activityKeys.recent(organizationId, limit),
    queryFn: () => activityApi.listRecent(limit),
    enabled: isAuthenticated && Boolean(organizationId),
  })
}
