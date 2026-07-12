import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import type { Dataset } from '@/features/datasets/types'
import { HomePage } from './home-page'

function makeDataset(
  overrides: Partial<Dataset> & Pick<Dataset, 'id' | 'name'>,
): Dataset {
  return {
    description: '',
    source: 'manual',
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

describe('HomePage', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  it('renders the first-run empty state when there are no datasets', async () => {
    server.use(http.get('*/datasets/', () => HttpResponse.json(page([]))))
    renderWithProviders(<HomePage />)

    expect(
      await screen.findByText(/Welcome to Novus RA Intelligence/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /import your first spreadsheet/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/more ways to start/i)).toBeInTheDocument()
  })

  it('renders recent datasets and the standard import CTA when datasets exist', async () => {
    server.use(
      http.get('*/datasets/', () =>
        HttpResponse.json(
          page([
            makeDataset({ id: 'd1', name: 'Dataset 1' }),
            makeDataset({ id: 'd2', name: 'Dataset 2' }),
          ]),
        ),
      ),
    )
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Welcome back')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /import spreadsheet/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Dataset 1')).toBeInTheDocument()
    expect(screen.getByText('Dataset 2')).toBeInTheDocument()
  })

  it('slices the datasets list to a maximum of 6', async () => {
    const manyDatasets = Array.from({ length: 10 }).map((_, i) =>
      makeDataset({ id: `d${i}`, name: `Dataset ${i}` }),
    )
    server.use(
      http.get('*/datasets/', () => HttpResponse.json(page(manyDatasets))),
    )
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Dataset 0')).toBeInTheDocument()
    expect(screen.getByText('Dataset 5')).toBeInTheDocument()
    expect(screen.queryByText('Dataset 6')).not.toBeInTheDocument()
  })
})
