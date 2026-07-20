import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clearSession } from '@/lib/session'
import {
  changePassword,
  confirmPasswordReset,
  getMe,
  login,
  logout,
  register,
  requestPasswordReset,
  updateMe,
} from './api'
import { useAuthStore } from './store'
import type { User } from './types'

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

/** Update the signed-in user's profile (display name); refreshes the cached user. */
export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateMe,
    onSuccess: (user: User) => queryClient.setQueryData(['me'], user),
  })
}

/** Change the signed-in user's password (current + new). No side effects. */
export function useChangePassword() {
  return useMutation({ mutationFn: changePassword })
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
