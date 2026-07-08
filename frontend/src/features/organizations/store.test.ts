import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore } from './store'

describe('workspace store', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().clear()
  })

  it('sets the current organization', () => {
    useWorkspaceStore.getState().setCurrentOrganization('org-1')

    expect(useWorkspaceStore.getState().currentOrganizationId).toBe('org-1')
  })

  it('clears the current organization', () => {
    useWorkspaceStore.getState().setCurrentOrganization('org-1')

    useWorkspaceStore.getState().clear()

    expect(useWorkspaceStore.getState().currentOrganizationId).toBeNull()
  })
})
