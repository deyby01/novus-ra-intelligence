import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import type { Dataset } from '@/features/datasets/types'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import { RecentDatasets } from './recent-datasets'

function makeDataset(
  overrides: Partial<Dataset> & Pick<Dataset, 'id'>,
): Dataset {
  return {
    name: 'A dataset',
    description: '',
    source: 'excel',
    row_count: 0,
    created_by: null,
    updated_by: null,
    created_at: '2026-07-10T00:00:00Z',
    updated_at: '2026-07-10T00:00:00Z',
    ...overrides,
  }
}

function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

describe('RecentDatasets', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  it('renders the workspace datasets with source badge and row count', async () => {
    server.use(
      http.get('*/datasets/', () =>
        HttpResponse.json(
          page([
            makeDataset({
              id: 'd1',
              name: 'Ventas Q3',
              description: 'Cifras mensuales',
              source: 'excel',
              row_count: 1662,
            }),
            makeDataset({
              id: 'd2',
              name: 'Leads Web',
              source: 'manual',
              row_count: 1,
            }),
          ]),
        ),
      ),
    )
    renderWithProviders(<RecentDatasets />)

    expect(await screen.findByText('Ventas Q3')).toBeInTheDocument()
    expect(screen.getByText('Cifras mensuales')).toBeInTheDocument()
    expect(screen.getByText('Excel')).toBeInTheDocument()
    // Localised thousands separator, and singular/plural.
    expect(screen.getByText('1.662 filas')).toBeInTheDocument()
    expect(screen.getByText('Manual')).toBeInTheDocument()
    expect(screen.getByText('1 fila')).toBeInTheDocument()
  })

  it('requests the most recent datasets from the API, not the default order', async () => {
    let requestedOrdering: string | null = null
    server.use(
      http.get('*/datasets/', ({ request }) => {
        requestedOrdering = new URL(request.url).searchParams.get('ordering')
        return HttpResponse.json(page([makeDataset({ id: 'd1' })]))
      }),
    )
    renderWithProviders(<RecentDatasets />)

    await screen.findByText('A dataset')
    expect(requestedOrdering).toBe('-updated_at')
  })

  it('shows an empty state with an import CTA when there are no datasets', async () => {
    server.use(http.get('*/datasets/', () => HttpResponse.json(page([]))))
    renderWithProviders(<RecentDatasets />)

    expect(
      await screen.findByText(/aún no tienes datasets/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /importar excel/i }),
    ).toBeInTheDocument()
  })

  it('shows an error state when the datasets cannot be loaded', async () => {
    server.use(
      http.get('*/datasets/', () => new HttpResponse(null, { status: 500 })),
    )
    renderWithProviders(<RecentDatasets />)

    expect(
      await screen.findByText(/no pudimos cargar tus datasets/i),
    ).toBeInTheDocument()
  })
})
