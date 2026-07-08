import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { apiClient } from './api-client'

const emptyPage = { count: 0, next: null, previous: null, results: [] }

describe('apiClient tenant header', () => {
  beforeEach(() => {
    useAuthStore.getState().clear()
    useWorkspaceStore.getState().clear()
  })

  it('attaches X-Organization when a workspace is selected', async () => {
    useWorkspaceStore.getState().setCurrentOrganization('org-42')
    let received: string | null = null
    server.use(
      http.get('*/datasets/', ({ request }) => {
        received = request.headers.get('X-Organization')
        return HttpResponse.json(emptyPage)
      }),
    )

    await apiClient.get('/datasets/')

    expect(received).toBe('org-42')
  })

  it('omits X-Organization when no workspace is selected', async () => {
    let received: string | null = 'sentinel'
    server.use(
      http.get('*/datasets/', ({ request }) => {
        received = request.headers.get('X-Organization')
        return HttpResponse.json(emptyPage)
      }),
    )

    await apiClient.get('/datasets/')

    expect(received).toBeNull()
  })
})
