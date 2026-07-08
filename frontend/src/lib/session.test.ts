import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { clearSession } from './session'

describe('clearSession', () => {
  beforeEach(() => {
    useAuthStore.getState().clear()
    useWorkspaceStore.getState().clear()
  })

  it('clears both the auth tokens and the selected workspace', () => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')

    clearSession()

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
    expect(useWorkspaceStore.getState().currentOrganizationId).toBeNull()
  })
})
