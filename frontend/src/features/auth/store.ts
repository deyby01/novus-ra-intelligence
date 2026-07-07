import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TokenPair, User } from './types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  setTokens: (tokens: TokenPair) => void
  setUser: (user: User | null) => void
  clear: () => void
}

/**
 * Auth store. Only the tokens are persisted to localStorage so a session
 * survives a reload; the user profile is re-fetched from `/auth/me/`.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: ({ access, refresh }) =>
        set({ accessToken: access, refreshToken: refresh }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'novus-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
)
