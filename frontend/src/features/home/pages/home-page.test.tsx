import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('triggers the sample dataset import and navigates on completion', async () => {
    let datasetCreated = false
    let jobCreated = false
    
    const originalFetch = globalThis.fetch

    server.use(
      http.get('*/datasets/', () => HttpResponse.json(page([]))),
      http.post('*/datasets/', () => {
        datasetCreated = true
        return HttpResponse.json({
          id: 'd-sample',
          name: 'Sample dataset',
          source: 'excel',
          created_by: null,
          updated_by: null,
          created_at: '',
          updated_at: '',
        })
      }),
      http.post('*/import-jobs/', () => {
        jobCreated = true
        return HttpResponse.json({
          id: 'j1',
          status: 'pending',
          dataset: 'd-sample',
          rows_processed: 0,
          errors: {},
          created_at: '',
          updated_at: '',
        })
      }),
      http.get('*/import-jobs/j1/', () => {
        return HttpResponse.json({
          id: 'j1',
          status: 'done',
          dataset: 'd-sample',
          rows_processed: 10,
          errors: {},
          created_at: '',
          updated_at: '',
        })
      }),
    )

    // Polyfill fetch for the sample file
    const mockFetch = vi.fn().mockResolvedValue({
      blob: () =>
        Promise.resolve(
          new Blob(['dummy'], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
        ),
    })
    globalThis.fetch = mockFetch as any

    renderWithProviders(<HomePage />)

    expect(
      await screen.findByText(/Welcome to Novus RA Intelligence/i),
    ).toBeInTheDocument()

    // Use click from testing-library/react instead of userEvent as we are in a simple test
    const trySampleButton = screen.getByRole('button', {
      name: /try a sample dataset/i,
    })
    trySampleButton.click()

    await waitFor(() => {
      expect(datasetCreated).toBe(true)
      expect(jobCreated).toBe(true)
    })
    
    globalThis.fetch = originalFetch
  })
})
