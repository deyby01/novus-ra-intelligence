import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import type { Dashboard } from '../types'
import { DashboardCard } from './dashboard-card'

function makeDashboard(
  overrides: Partial<Dashboard> & Pick<Dashboard, 'id' | 'name'>,
): Dashboard {
  return {
    description: '',
    widget_types: ['kpi'],
    dataset_ids: ['x'],
    created_by: null,
    updated_by: null,
    created_at: '2026-07-08T00:00:00Z',
    updated_at: '2026-07-08T00:00:00Z',
    ...overrides,
  }
}

async function openMenu() {
  await userEvent.click(
    screen.getByRole('button', { name: /acciones del dashboard/i }),
  )
}

describe('DashboardCard actions', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  it('renames the dashboard via PATCH', async () => {
    let patched: unknown = null
    server.use(
      http.patch('*/dashboards/d1/', async ({ request }) => {
        patched = await request.json()
        return HttpResponse.json(makeDashboard({ id: 'd1', name: 'Nuevo' }))
      }),
    )
    renderWithProviders(
      <DashboardCard dashboard={makeDashboard({ id: 'd1', name: 'Viejo' })} />,
    )

    await openMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Renombrar' }))

    const input = screen.getByLabelText(/nombre/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'Nuevo')
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(patched).toEqual({ name: 'Nuevo' }))
  })

  it('duplicates the dashboard', async () => {
    let duplicated = false
    server.use(
      http.post('*/dashboards/d1/duplicate/', () => {
        duplicated = true
        return HttpResponse.json(
          makeDashboard({ id: 'd2', name: 'Viejo (copia)' }),
        )
      }),
    )
    renderWithProviders(
      <DashboardCard dashboard={makeDashboard({ id: 'd1', name: 'Viejo' })} />,
    )

    await openMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicar' }))

    await waitFor(() => expect(duplicated).toBe(true))
  })
})
