import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import type { Widget } from '../types'
import { AddWidgetModal } from './add-widget-modal'

function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

const WIDGET: Widget = {
  id: 'w1',
  dashboard: 'd1',
  dataset: 'ds1',
  chart_type: 'bar',
  config: { agg: 'sum', metric: 'units', title: 'Ventas', size: 'medium' },
  position: null,
  order: 0,
  created_at: '2026-07-08T00:00:00Z',
  updated_at: '2026-07-08T00:00:00Z',
}

describe('AddWidgetModal (edit mode)', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
    server.use(
      http.get('*/datasets/', () =>
        HttpResponse.json(
          page([{ id: 'ds1', name: 'Ventas', row_count: 5, field_count: 2 }]),
        ),
      ),
      http.get('*/dataset-fields/', () =>
        HttpResponse.json(
          page([
            {
              id: 'f1',
              dataset: 'ds1',
              key: 'units',
              label: 'Units',
              field_type: 'number',
              order: 0,
            },
          ]),
        ),
      ),
    )
  })

  it('prefills from the widget and PATCHes the edited config', async () => {
    let patched: unknown = null
    server.use(
      http.patch('*/widgets/w1/', async ({ request }) => {
        patched = await request.json()
        return HttpResponse.json({ ...WIDGET })
      }),
    )
    renderWithProviders(
      <AddWidgetModal
        dashboardId="d1"
        isOpen
        editWidget={WIDGET}
        onClose={() => {}}
      />,
    )

    expect(await screen.findByText('Editar widget')).toBeInTheDocument()
    const title = screen.getByLabelText(/título/i)
    expect(title).toHaveValue('Ventas')

    await userEvent.clear(title)
    await userEvent.type(title, 'Ventas 2024')
    await userEvent.click(
      screen.getByRole('button', { name: /guardar cambios/i }),
    )

    await waitFor(() =>
      expect(patched).toEqual({
        dataset: 'ds1',
        chart_type: 'bar',
        config: {
          agg: 'sum',
          metric: 'units',
          title: 'Ventas 2024',
          size: 'medium',
        },
      }),
    )
  })
})
