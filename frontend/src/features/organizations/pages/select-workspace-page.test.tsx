import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import { useWorkspaceStore } from '../store'
import { SelectWorkspacePage } from './select-workspace-page'

const membershipsPayload = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 'm1',
      role: 'admin',
      organization: {
        id: 'org-1',
        name: 'Acme',
        slug: 'acme',
        plan: 'starter',
      },
    },
    {
      id: 'm2',
      role: 'operator',
      organization: {
        id: 'org-2',
        name: 'Globex',
        slug: 'globex',
        plan: 'pro',
      },
    },
  ],
}

describe('SelectWorkspacePage', () => {
  beforeEach(() => {
    // useMemberships is gated on authentication.
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().clear()
  })

  it('lists the user workspaces and selects one on click', async () => {
    server.use(
      http.get('*/memberships/', () => HttpResponse.json(membershipsPayload)),
    )
    renderWithProviders(<SelectWorkspacePage />)

    expect(await screen.findByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Globex')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Globex'))

    await waitFor(() =>
      expect(useWorkspaceStore.getState().currentOrganizationId).toBe('org-2'),
    )
  })

  it('shows an empty state when the user has no workspaces', async () => {
    server.use(
      http.get('*/memberships/', () =>
        HttpResponse.json({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
      ),
    )
    renderWithProviders(<SelectWorkspacePage />)

    expect(
      await screen.findByText(/don't belong to any workspace/i),
    ).toBeInTheDocument()
  })
})
