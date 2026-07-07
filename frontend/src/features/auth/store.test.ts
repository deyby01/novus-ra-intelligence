import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './store'

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.getState().clear()
  })

  it('stores the token pair', () => {
    useAuthStore
      .getState()
      .setTokens({ access: 'access-1', refresh: 'refresh-1' })

    expect(useAuthStore.getState().accessToken).toBe('access-1')
    expect(useAuthStore.getState().refreshToken).toBe('refresh-1')
  })

  it('clears tokens and user on logout', () => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useAuthStore.getState().setUser({ id: '1', email: 'user@example.com' })

    useAuthStore.getState().clear()

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
