import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import type { Dataset } from '../types'
import { DatasetsPage } from './datasets-page'

function makeDataset(
  overrides: Partial<Dataset> & Pick<Dataset, 'id' | 'name'>,
): Dataset {
  return {
    description: '',
    source: 'manual',
    row_count: 0,
    field_count: 0,
    has_report: false,
    last_opened_at: null,
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

function stubDatasets(datasets: Dataset[]) {
  server.use(http.get('*/datasets/', () => HttpResponse.json(page(datasets))))
}

describe('DatasetsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  it('renders the datasets returned by the API', async () => {
    stubDatasets([
      makeDataset({
        id: 'd1',
        name: 'Sales',
        description: 'Monthly sales',
        source: 'excel',
      }),
      makeDataset({ id: 'd2', name: 'Leads' }),
    ])
    renderWithProviders(<DatasetsPage />)

    expect(await screen.findByText('Sales')).toBeInTheDocument()
    expect(screen.getByText('Leads')).toBeInTheDocument()
  })

  it('summarises the workspace in the KPI strip', async () => {
    stubDatasets([
      makeDataset({ id: 'd1', name: 'Sales', source: 'excel', row_count: 100 }),
      makeDataset({
        id: 'd2',
        name: 'Leads',
        source: 'manual',
        row_count: 50,
        has_report: true,
      }),
    ])
    renderWithProviders(<DatasetsPage />)

    // Total rows is a distinctive derived value: 100 + 50.
    expect(await screen.findByText('150')).toBeInTheDocument()
    expect(screen.getByText('Filas totales')).toBeInTheDocument()
    expect(screen.getByText('Importados')).toBeInTheDocument()
    expect(screen.getByText('Con overview IA')).toBeInTheDocument()
  })

  it('filters the grid by the search query', async () => {
    stubDatasets([
      makeDataset({ id: 'd1', name: 'Sales', source: 'excel' }),
      makeDataset({ id: 'd2', name: 'Leads' }),
    ])
    renderWithProviders(<DatasetsPage />)

    await screen.findByText('Sales')
    await userEvent.type(
      screen.getByPlaceholderText(/buscar datasets/i),
      'lead',
    )

    expect(screen.getByText('Leads')).toBeInTheDocument()
    expect(screen.queryByText('Sales')).not.toBeInTheDocument()
  })

  it('filters the grid by dataset type', async () => {
    stubDatasets([
      makeDataset({ id: 'd1', name: 'Sales', source: 'excel' }),
      makeDataset({ id: 'd2', name: 'Leads', source: 'manual' }),
    ])
    renderWithProviders(<DatasetsPage />)

    await screen.findByText('Sales')
    await userEvent.click(screen.getByRole('button', { name: 'Manual' }))

    expect(screen.getByText('Leads')).toBeInTheDocument()
    expect(screen.queryByText('Sales')).not.toBeInTheDocument()
  })

  it('tells the user when nothing matches the search', async () => {
    stubDatasets([makeDataset({ id: 'd1', name: 'Sales' })])
    renderWithProviders(<DatasetsPage />)

    await screen.findByText('Sales')
    await userEvent.type(screen.getByPlaceholderText(/buscar datasets/i), 'zzz')

    expect(screen.getByText(/sin datasets que coincidan/i)).toBeInTheDocument()
  })

  it('shows an empty state when there are no datasets', async () => {
    stubDatasets([])
    renderWithProviders(<DatasetsPage />)

    expect(await screen.findByText(/aún no hay datasets/i)).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get('*/datasets/', () => new HttpResponse(null, { status: 500 })),
    )
    renderWithProviders(<DatasetsPage />)

    expect(
      await screen.findByText(/no pudimos cargar tus datasets/i),
    ).toBeInTheDocument()
  })

  it('switches to the list view', async () => {
    stubDatasets([makeDataset({ id: 'd1', name: 'Sales', source: 'excel' })])
    renderWithProviders(<DatasetsPage />)

    await screen.findByText('Sales')
    await userEvent.click(
      screen.getByRole('button', { name: /vista de lista/i }),
    )

    // The list row still surfaces the dataset and its Overview IA action.
    const overview = screen.getByRole('link', { name: /overview ia/i })
    expect(within(overview).getByText(/overview ia/i)).toBeInTheDocument()
  })

  it('refetches for the new workspace when the organization changes', async () => {
    server.use(
      http.get('*/datasets/', ({ request }) =>
        HttpResponse.json(
          page(
            request.headers.get('X-Organization') === 'org-2'
              ? [makeDataset({ id: 'd2', name: 'Only in Beta' })]
              : [makeDataset({ id: 'd1', name: 'Only in Alpha' })],
          ),
        ),
      ),
    )
    renderWithProviders(<DatasetsPage />)
    expect(await screen.findByText('Only in Alpha')).toBeInTheDocument()

    act(() => useWorkspaceStore.getState().setCurrentOrganization('org-2'))

    expect(await screen.findByText('Only in Beta')).toBeInTheDocument()
    expect(screen.queryByText('Only in Alpha')).not.toBeInTheDocument()
  })
})
