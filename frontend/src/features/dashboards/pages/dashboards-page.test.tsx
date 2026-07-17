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
    widget_types: [],
    dataset_ids: [],
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

function stubDashboards(dashboards: Dashboard[]) {
  server.use(
    http.get('*/dashboards/', () => HttpResponse.json(page(dashboards))),
  )
}

describe('DashboardsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  it('renders the dashboards returned by the API', async () => {
    stubDashboards([
      makeDashboard({ id: 'd1', name: 'Revenue' }),
      makeDashboard({ id: 'd2', name: 'Pipeline' }),
    ])
    renderWithProviders(<DashboardsPage />)

    expect(await screen.findByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('Pipeline')).toBeInTheDocument()
  })

  it('shows each dashboard widget + dataset counts from real widget types', async () => {
    stubDashboards([
      makeDashboard({
        id: 'd1',
        name: 'Revenue',
        widget_types: ['kpi', 'bar', 'line'],
        dataset_ids: ['x', 'y'],
      }),
    ])
    renderWithProviders(<DashboardsPage />)

    await screen.findByText('Revenue')
    expect(screen.getByText('3 widgets')).toBeInTheDocument()
    expect(screen.getByText('2 datasets')).toBeInTheDocument()
  })

  it('summarises the workspace in the KPI strip', async () => {
    stubDashboards([
      makeDashboard({
        id: 'd1',
        name: 'A',
        widget_types: ['kpi', 'bar'],
        dataset_ids: ['x', 'y'],
      }),
      makeDashboard({
        id: 'd2',
        name: 'B',
        widget_types: ['line'],
        dataset_ids: ['y', 'z'],
      }),
    ])
    renderWithProviders(<DashboardsPage />)

    await screen.findByText('A')
    expect(screen.getByText('Widgets totales')).toBeInTheDocument()
    expect(screen.getByText('Datasets conectados')).toBeInTheDocument()
  })

  it('filters the grid by the search query', async () => {
    stubDashboards([
      makeDashboard({ id: 'd1', name: 'Revenue' }),
      makeDashboard({ id: 'd2', name: 'Pipeline' }),
    ])
    renderWithProviders(<DashboardsPage />)

    await screen.findByText('Revenue')
    await userEvent.type(
      screen.getByPlaceholderText(/buscar dashboards/i),
      'pipe',
    )

    expect(screen.getByText('Pipeline')).toBeInTheDocument()
    expect(screen.queryByText('Revenue')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no dashboards', async () => {
    stubDashboards([])
    renderWithProviders(<DashboardsPage />)

    expect(
      await screen.findByText(/aún no hay dashboards/i),
    ).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get('*/dashboards/', () => new HttpResponse(null, { status: 500 })),
    )
    renderWithProviders(<DashboardsPage />)

    expect(
      await screen.findByText(/no pudimos cargar tus dashboards/i),
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

  it('creates a blank dashboard from the dialog', async () => {
    const onPost = vi.fn()
    stubDashboards([])
    server.use(
      http.post('*/dashboards/', async ({ request }) => {
        onPost(await request.json())
        return HttpResponse.json(makeDashboard({ id: 'd1', name: 'Q4 Goals' }))
      }),
    )
    renderWithProviders(<DashboardsPage />)

    await userEvent.click(
      (await screen.findAllByRole('button', { name: /nuevo dashboard/i }))[0],
    )
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Q4 Goals')
    await userEvent.click(
      screen.getByRole('button', { name: /crear dashboard/i }),
    )

    expect(onPost).toHaveBeenCalledWith({ name: 'Q4 Goals' })
  })

  it('explains that AI generation is coming soon', async () => {
    stubDashboards([])
    renderWithProviders(<DashboardsPage />)

    await userEvent.click(
      (await screen.findAllByRole('button', { name: /generar con ia/i }))[0],
    )

    expect(await screen.findByText(/próximamente/i)).toBeInTheDocument()
  })
})
