import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { useOnboardingStore } from '@/features/onboarding/store'
import { runTour } from '@/features/onboarding/tour'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import { HomePage } from './home-page'

vi.mock('@/features/onboarding/tour', () => ({ runTour: vi.fn() }))
const mockRunTour = vi.mocked(runTour)

function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

describe('HomePage', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
    useOnboardingStore.getState().reset()
    mockRunTour.mockClear()
    // The Home mounts every section; stub the lists they each fetch so no
    // request goes unhandled. Individual tests override what they assert on.
    server.use(
      http.get('*/datasets/', () => HttpResponse.json(page([]))),
      http.get('*/reports/', () => HttpResponse.json(page([]))),
      http.get('*/activity/', () => HttpResponse.json(page([]))),
    )
  })

  it('renders the redesigned hero and section blocks', async () => {
    renderWithProviders(<HomePage />)

    expect(
      await screen.findByRole('heading', {
        name: /convierte tu excel en decisiones/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Bienvenido de vuelta')).toBeInTheDocument()
    expect(screen.getByText('Reportes recientes')).toBeInTheDocument()
    expect(screen.getByText('Datasets recientes')).toBeInTheDocument()
    expect(screen.getByText('Actividad reciente')).toBeInTheDocument()
  })

  it('runs the home tour once when it has not been seen', async () => {
    useOnboardingStore.setState({ hasSeenHomeTour: false })
    renderWithProviders(<HomePage />)

    await waitFor(() => expect(mockRunTour).toHaveBeenCalledWith('/'))
  })

  it('does not run the home tour once it has already been seen', async () => {
    useOnboardingStore.setState({ hasSeenHomeTour: true })
    renderWithProviders(<HomePage />)

    await screen.findByRole('heading', {
      name: /convierte tu excel en decisiones/i,
    })
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(mockRunTour).not.toHaveBeenCalled()
  })

  it('triggers the sample dataset import from the hero "Probar demo" button', async () => {
    let datasetCreated = false
    let jobCreated = false
    const originalFetch = globalThis.fetch

    server.use(
      http.post('*/datasets/', () => {
        datasetCreated = true
        return HttpResponse.json({ id: 'd-sample', name: 'Sample dataset' })
      }),
      http.post('*/import-jobs/', () => {
        jobCreated = true
        return HttpResponse.json({
          id: 'j1',
          status: 'pending',
          dataset: 'd-sample',
          rows_processed: 0,
          errors: {},
        })
      }),
    )

    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: () =>
        Promise.resolve(new Blob(['x'], { type: 'application/xlsx' })),
    }) as unknown as typeof fetch

    renderWithProviders(<HomePage />)

    const button = await screen.findByRole('button', { name: /probar demo/i })
    button.click()

    await waitFor(() => {
      expect(datasetCreated).toBe(true)
      expect(jobCreated).toBe(true)
    })

    globalThis.fetch = originalFetch
  })
})
