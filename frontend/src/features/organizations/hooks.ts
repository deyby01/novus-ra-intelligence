import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { getMemberships } from './api'

/** Query the current user's workspaces once authenticated. */
export function useMemberships() {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))
  return useQuery({
    queryKey: ['memberships'],
    queryFn: getMemberships,
    enabled: isAuthenticated,
  })
}
