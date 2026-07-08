import { useMutation, useQuery } from '@tanstack/react-query'
import { clearSession } from '@/lib/session'
import { getMe, login, logout } from './api'
import { useAuthStore } from './store'

export function useLogin() {
  const setTokens = useAuthStore((state) => state.setTokens)
  return useMutation({
    mutationFn: login,
    onSuccess: (tokens) => setTokens(tokens),
  })
}

export function useMe() {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))
  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: isAuthenticated,
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const { refreshToken } = useAuthStore.getState()
      if (refreshToken) {
        await logout(refreshToken)
      }
    },
    onSettled: () => clearSession(),
  })
}
