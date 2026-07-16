import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import type { Report } from '@/features/reports/types'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import { RecentReports } from './recent-reports'

function makeReport(overrides: Partial<Report> & Pick<Report, 'id'>): Report {
  return {
    dataset: 'd1',
    dataset_name: 'Ventas Q3',
    status: 'COMPLETED',
    content: '# Report',
    error_message: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

const datasetsPage = page([
  {
    id: 'd1',
    name: 'Ventas Q3',
    description: '',
    source: 'excel',
    row_count: 10,
    created_by: null,
    updated_by: null,
    created_at: '2026-07-10T00:00:00Z',
    updated_at: '2026-07-10T00:00:00Z',
  },
])

describe('RecentReports', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
    server.use(http.get('*/datasets/', () => HttpResponse.json(datasetsPage)))
  })

  it('lists the workspace reports labelled by their dataset', async () => {
    server.use(
      http.get('*/reports/', () =>
        HttpResponse.json(
          page([makeReport({ id: 'r1', dataset_name: 'Inventario' })]),
        ),
      ),
    )
    renderWithProviders(<RecentReports />)

    expect(await screen.findByText('Reporte — Inventario')).toBeInTheDocument()
  })

  it('asks the API for the newest reports', async () => {
    let ordering: string | null = null
    server.use(
      http.get('*/reports/', ({ request }) => {
        ordering = new URL(request.url).searchParams.get('ordering')
        return HttpResponse.json(page([makeReport({ id: 'r1' })]))
      }),
    )
    renderWithProviders(<RecentReports />)

    await screen.findByText('Reporte — Ventas Q3')
    expect(ordering).toBe('-created_at')
  })

  it('surfaces a report still being generated', async () => {
    server.use(
      http.get('*/reports/', () =>
        HttpResponse.json(page([makeReport({ id: 'r1', status: 'PENDING' })])),
      ),
    )
    renderWithProviders(<RecentReports />)

    expect(await screen.findByText(/generando/i)).toBeInTheDocument()
  })

  it('surfaces a failed report instead of pretending it succeeded', async () => {
    server.use(
      http.get('*/reports/', () =>
        HttpResponse.json(page([makeReport({ id: 'r1', status: 'FAILED' })])),
      ),
    )
    renderWithProviders(<RecentReports />)

    expect(await screen.findByText(/falló/i)).toBeInTheDocument()
  })

  it('shows an empty state when nothing has been generated yet', async () => {
    server.use(http.get('*/reports/', () => HttpResponse.json(page([]))))
    renderWithProviders(<RecentReports />)

    expect(
      await screen.findByText(/aún no has generado reportes/i),
    ).toBeInTheDocument()
  })

  it('generates a report for the dataset picked from the selector', async () => {
    let requestedDataset: string | null = null
    server.use(
      http.get('*/reports/', () => HttpResponse.json(page([]))),
      http.post('*/reports/', async ({ request }) => {
        const body = (await request.json()) as { dataset: string }
        requestedDataset = body.dataset
        return HttpResponse.json(
          makeReport({ id: 'r-new', status: 'PENDING' }),
          {
            status: 201,
          },
        )
      }),
    )
    renderWithProviders(<RecentReports />)

    await userEvent.click(
      await screen.findByRole('button', { name: /generar nuevo reporte/i }),
    )
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Ventas Q3' }),
    )

    await waitFor(() => expect(requestedDataset).toBe('d1'))
  })

  it('disables generating when the workspace has no datasets', async () => {
    server.use(
      http.get('*/datasets/', () => HttpResponse.json(page([]))),
      http.get('*/reports/', () => HttpResponse.json(page([]))),
    )
    renderWithProviders(<RecentReports />)

    expect(
      await screen.findByRole('button', { name: /importa un dataset/i }),
    ).toBeDisabled()
  })
})
