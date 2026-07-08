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
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
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

  it('shows the "No widgets yet" placeholder', async () => {
    server.use(
      http.get('*/dashboards/dash-1/', () => HttpResponse.json(DASHBOARD)),
    )
    renderDetail()

    expect(await screen.findByText(/no widgets yet/i)).toBeInTheDocument()
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
      await screen.findByText(/couldn't load this dashboard/i),
    ).toBeInTheDocument()
  })

  it('deletes the dashboard after confirming', async () => {
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
      await screen.findByRole('button', { name: /delete dashboard/i }),
    )
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
