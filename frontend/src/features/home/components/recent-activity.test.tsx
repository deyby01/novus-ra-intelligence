import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ActivityEvent } from '@/features/activity/types'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import { RecentActivity } from './recent-activity'

function makeEvent(
  overrides: Partial<ActivityEvent> & Pick<ActivityEvent, 'id'>,
): ActivityEvent {
  return {
    verb: 'DATASET_IMPORTED',
    target_type: 'dataset',
    target_id: 'd1',
    target_label: 'Ventas Q3',
    actor_email: 'visual@example.com',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

describe('RecentActivity', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  it('renders each event as a first-person phrase with the target in bold', async () => {
    server.use(
      http.get('*/activity/', () =>
        HttpResponse.json(
          page([
            makeEvent({
              id: 'e1',
              verb: 'REPORT_GENERATED',
              target_label: 'Inventario',
            }),
            makeEvent({
              id: 'e2',
              verb: 'DASHBOARD_CREATED',
              target_type: 'dashboard',
              target_label: 'Finanzas',
            }),
          ]),
        ),
      ),
    )
    renderWithProviders(<RecentActivity />)

    expect(
      await screen.findByText(/la ia generó un reporte de/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Inventario')).toBeInTheDocument()
    expect(screen.getByText(/creaste el dashboard/i)).toBeInTheDocument()
    expect(screen.getByText('Finanzas')).toBeInTheDocument()
  })

  it('asks the API for the newest events', async () => {
    let ordering: string | null = null
    server.use(
      http.get('*/activity/', ({ request }) => {
        ordering = new URL(request.url).searchParams.get('ordering')
        return HttpResponse.json(page([makeEvent({ id: 'e1' })]))
      }),
    )
    renderWithProviders(<RecentActivity />)

    await screen.findByText(/importaste/i)
    expect(ordering).toBe('-created_at')
  })

  it('shows an empty state when nothing has happened yet', async () => {
    server.use(http.get('*/activity/', () => HttpResponse.json(page([]))))
    renderWithProviders(<RecentActivity />)

    expect(await screen.findByText(/aún no hay actividad/i)).toBeInTheDocument()
  })

  it('surfaces an error instead of an empty timeline', async () => {
    server.use(
      http.get('*/activity/', () => new HttpResponse(null, { status: 500 })),
    )
    renderWithProviders(<RecentActivity />)

    expect(
      await screen.findByText(/no pudimos cargar la actividad/i),
    ).toBeInTheDocument()
  })
})
