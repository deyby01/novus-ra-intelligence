import { act, screen } from '@testing-library/react'
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

describe('DatasetsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  it('renders the datasets returned by the API', async () => {
    server.use(
      http.get('*/datasets/', () =>
        HttpResponse.json(
          page([
            makeDataset({
              id: 'd1',
              name: 'Sales',
              description: 'Monthly sales',
              source: 'excel',
            }),
            makeDataset({ id: 'd2', name: 'Leads' }),
          ]),
        ),
      ),
    )
    renderWithProviders(<DatasetsPage />)

    expect(await screen.findByText('Sales')).toBeInTheDocument()
    expect(screen.getByText('Leads')).toBeInTheDocument()
  })

  it('shows an empty state when there are no datasets', async () => {
    server.use(http.get('*/datasets/', () => HttpResponse.json(page([]))))
    renderWithProviders(<DatasetsPage />)

    expect(await screen.findByText(/no datasets yet/i)).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get('*/datasets/', () => new HttpResponse(null, { status: 500 })),
    )
    renderWithProviders(<DatasetsPage />)

    expect(
      await screen.findByText(/couldn't load your datasets/i),
    ).toBeInTheDocument()
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
