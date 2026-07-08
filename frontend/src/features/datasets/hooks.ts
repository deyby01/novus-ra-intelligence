import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { getDatasets } from './api'

/**
 * Query the active workspace's datasets. Keyed by the organization id so
 * switching workspaces refetches instead of showing another tenant's cache.
 */
export function useDatasets() {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))
  const organizationId = useWorkspaceStore(
    (state) => state.currentOrganizationId,
  )
  return useQuery({
    queryKey: ['datasets', organizationId],
    queryFn: getDatasets,
    enabled: isAuthenticated && Boolean(organizationId),
  })
}
