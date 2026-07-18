import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import { GenerateWithAiDialog } from './generate-with-ai-dialog'

function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

function renderDialog() {
  return renderWithProviders(
    <GenerateWithAiDialog>
      <button type="button">Generar con IA</button>
    </GenerateWithAiDialog>,
  )
}

describe('GenerateWithAiDialog', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  it('generates a dashboard from the picked dataset', async () => {
    let posted: unknown = null
    server.use(
      http.get('*/datasets/', () =>
        HttpResponse.json(
          page([{ id: 'ds1', name: 'Ventas', row_count: 5, field_count: 2 }]),
        ),
      ),
      http.post('*/dashboards/generate/', async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({
          id: 'd-new',
          name: 'Panel de Ventas',
          description: '',
          widget_types: [],
          dataset_ids: [],
          created_by: null,
          updated_by: null,
          created_at: '2026-07-17T00:00:00Z',
          updated_at: '2026-07-17T00:00:00Z',
        })
      }),
    )
    renderDialog()

    await userEvent.click(
      screen.getByRole('button', { name: /generar con ia/i }),
    )
    await userEvent.click(await screen.findByText('Ventas'))
    await userEvent.click(
      screen.getByRole('button', { name: /generar dashboard/i }),
    )

    await waitFor(() => expect(posted).toEqual({ dataset: 'ds1' }))
  })

  it('prompts to import when the workspace has no datasets', async () => {
    server.use(http.get('*/datasets/', () => HttpResponse.json(page([]))))
    renderDialog()

    await userEvent.click(
      screen.getByRole('button', { name: /generar con ia/i }),
    )

    expect(
      await screen.findByText(/importa un dataset primero/i),
    ).toBeInTheDocument()
  })
})
