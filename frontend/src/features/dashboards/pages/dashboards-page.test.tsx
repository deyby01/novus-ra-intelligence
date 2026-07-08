import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import type { Dashboard } from '../types'
import { DashboardsPage } from './dashboards-page'

function makeDashboard(
  overrides: Partial<Dashboard> & Pick<Dashboard, 'id' | 'name'>,
): Dashboard {
  return {
    created_by: null,
    updated_by: null,
    created_at: '2026-07-08T00:00:00Z',
    updated_at: '2026-07-08T00:00:00Z',
    ...overrides,
  }
}

function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

describe('DashboardsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  it('renders the dashboards returned by the API', async () => {
    server.use(
      http.get('*/dashboards/', () =>
        HttpResponse.json(
          page([
            makeDashboard({ id: 'd1', name: 'Revenue' }),
            makeDashboard({ id: 'd2', name: 'Pipeline' }),
          ]),
        ),
      ),
    )
    renderWithProviders(<DashboardsPage />)

    expect(await screen.findByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('Pipeline')).toBeInTheDocument()
  })

  it('shows an empty state when there are no dashboards', async () => {
    server.use(http.get('*/dashboards/', () => HttpResponse.json(page([]))))
    renderWithProviders(<DashboardsPage />)

    expect(await screen.findByText(/no dashboards yet/i)).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get('*/dashboards/', () => new HttpResponse(null, { status: 500 })),
    )
    renderWithProviders(<DashboardsPage />)

    expect(
      await screen.findByText(/couldn't load your dashboards/i),
    ).toBeInTheDocument()
  })

  it('refetches for the new workspace when the organization changes', async () => {
    server.use(
      http.get('*/dashboards/', ({ request }) =>
        HttpResponse.json(
          page(
            request.headers.get('X-Organization') === 'org-2'
              ? [makeDashboard({ id: 'd2', name: 'Only in Beta' })]
              : [makeDashboard({ id: 'd1', name: 'Only in Alpha' })],
          ),
        ),
      ),
    )
    renderWithProviders(<DashboardsPage />)
    expect(await screen.findByText('Only in Alpha')).toBeInTheDocument()

    act(() => useWorkspaceStore.getState().setCurrentOrganization('org-2'))

    expect(await screen.findByText('Only in Beta')).toBeInTheDocument()
    expect(screen.queryByText('Only in Alpha')).not.toBeInTheDocument()
  })

  it('creates a dashboard and shows it after the list refetches', async () => {
    let created = false
    const onPost = vi.fn()
    server.use(
      http.get('*/dashboards/', () =>
        HttpResponse.json(
          page(created ? [makeDashboard({ id: 'd1', name: 'Q4 Goals' })] : []),
        ),
      ),
      http.post('*/dashboards/', async ({ request }) => {
        onPost(await request.json())
        created = true
        return HttpResponse.json(makeDashboard({ id: 'd1', name: 'Q4 Goals' }))
      }),
    )
    renderWithProviders(<DashboardsPage />)

    await userEvent.click(
      await screen.findByRole('button', { name: /new dashboard/i }),
    )
    await userEvent.type(screen.getByLabelText(/name/i), 'Q4 Goals')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByText('Q4 Goals')).toBeInTheDocument()
    expect(onPost).toHaveBeenCalledWith({ name: 'Q4 Goals' })
  })
})
