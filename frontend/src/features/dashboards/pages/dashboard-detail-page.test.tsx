import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import { DashboardDetailPage } from './dashboard-detail-page'

const DASHBOARD = {
  id: 'dash-1',
  name: 'Revenue',
  created_by: null,
  updated_by: null,
  created_at: '2026-07-08T00:00:00Z',
  updated_at: '2026-07-08T00:00:00Z',
}

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route
        path="/dashboards/:dashboardId"
        element={<DashboardDetailPage />}
      />
    </Routes>,
    { route: '/dashboards/dash-1' },
  )
}

describe('DashboardDetailPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
    server.use(
      http.get('*/widgets/', () =>
        HttpResponse.json({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
      ),
    )
  })

  it('renders the dashboard name', async () => {
    server.use(
      http.get('*/dashboards/dash-1/', () => HttpResponse.json(DASHBOARD)),
    )
    renderDetail()

    expect(
      await screen.findByRole('heading', { name: 'Revenue' }),
    ).toBeInTheDocument()
  })

  it('shows the empty-widgets placeholder', async () => {
    server.use(
      http.get('*/dashboards/dash-1/', () => HttpResponse.json(DASHBOARD)),
    )
    renderDetail()

    expect(await screen.findByText(/aún no hay widgets/i)).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(
        '*/dashboards/dash-1/',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    renderDetail()

    expect(
      await screen.findByText(/no pudimos cargar este dashboard/i),
    ).toBeInTheDocument()
  })

  it('shows the AI insight panel when the dashboard has a description', async () => {
    server.use(
      http.get('*/dashboards/dash-1/', () =>
        HttpResponse.json({
          ...DASHBOARD,
          description: 'Mayo fue el mejor mes del trimestre.',
        }),
      ),
    )
    renderDetail()

    expect(await screen.findByText(/insight de la ia/i)).toBeInTheDocument()
    expect(
      screen.getByText(/mayo fue el mejor mes del trimestre/i),
    ).toBeInTheDocument()
  })

  it('reveals a resize handle for each widget in edit mode', async () => {
    server.use(
      http.get('*/dashboards/dash-1/', () => HttpResponse.json(DASHBOARD)),
      http.get('*/widgets/', () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 'w1',
              dashboard: 'dash-1',
              dataset: 'ds1',
              chart_type: 'kpi',
              config: { agg: 'count', size: 'small' },
              position: null,
              created_at: '2026-07-08T00:00:00Z',
              updated_at: '2026-07-08T00:00:00Z',
            },
          ],
        }),
      ),
      http.get('*/dataset-fields/', () =>
        HttpResponse.json({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
      ),
      http.get('*/datasets/ds1/aggregate/', () =>
        HttpResponse.json({
          aggregation: 'count',
          metric: null,
          group_by: null,
          results: [{ group: null, value: 5 }],
        }),
      ),
    )
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }))

    expect(
      await screen.findByRole('button', { name: /redimensionar widget/i }),
    ).toBeInTheDocument()
  })

  it('deletes the dashboard after confirming from the menu', async () => {
    const onDelete = vi.fn()
    server.use(
      http.get('*/dashboards/dash-1/', () => HttpResponse.json(DASHBOARD)),
      http.delete('*/dashboards/dash-1/', () => {
        onDelete()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderDetail()

    await userEvent.click(
      await screen.findByRole('button', { name: /acciones del dashboard/i }),
    )
    await userEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
