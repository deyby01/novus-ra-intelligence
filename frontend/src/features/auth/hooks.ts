import { useMutation, useQuery } from '@tanstack/react-query'
import { clearSession } from '@/lib/session'
import {
  confirmPasswordReset,
  getMe,
  login,
  logout,
  register,
  requestPasswordReset,
} from './api'
import { useAuthStore } from './store'

export function useLogin() {
  const setTokens = useAuthStore((state) => state.setTokens)
  return useMutation({
    mutationFn: login,
    onSuccess: (tokens) => setTokens(tokens),
  })
}

/**
 * Sign up mutation. Unlike `useLogin`, it does NOT set tokens here: the form
 * sets tokens AND the freshly created workspace together so the new user skips
 * the workspace picker and lands straight on the Home hub.
 */
export function useRegister() {
  return useMutation({ mutationFn: register })
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

/** Request a password-reset email. No side effects — the form handles the UI. */
export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset })
}

/** Confirm password reset with uid/token/newPassword. No side effects. */
export function useConfirmPasswordReset() {
  return useMutation({ mutationFn: confirmPasswordReset })
}
