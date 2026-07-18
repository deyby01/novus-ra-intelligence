import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import { SuggestWidgetDialog } from './suggest-widget-dialog'

function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

const OVERVIEW = {
  headline: {
    row_count: 5,
    field_count: 2,
    numeric_field_count: 1,
    generated_at: '2026-07-18T00:00:00Z',
  },
  widgets: [
    {
      chart_type: 'kpi',
      aggregation: 'count',
      metric: null,
      group_by: null,
      results: [{ group: null, value: 5 }],
      config: {
        agg: 'count',
        metric: null,
        group_by: null,
        title: 'Total de registros',
        size: 'small',
      },
    },
  ],
}

describe('SuggestWidgetDialog', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  it('adds a suggested widget from the dataset overview', async () => {
    let posted: unknown = null
    server.use(
      http.get('*/datasets/', () =>
        HttpResponse.json(
          page([{ id: 'ds1', name: 'Ventas', row_count: 5, field_count: 2 }]),
        ),
      ),
      http.get('*/datasets/ds1/overview/', () => HttpResponse.json(OVERVIEW)),
      http.post('*/widgets/', async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({ id: 'w-new' })
      }),
    )
    renderWithProviders(
      <SuggestWidgetDialog dashboardId="d1">
        <button type="button">Sugerir con IA</button>
      </SuggestWidgetDialog>,
    )

    await userEvent.click(
      screen.getByRole('button', { name: /sugerir con ia/i }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: /ventas/i }),
    )
    await screen.findByText('Total de registros')
    await userEvent.click(screen.getByRole('button', { name: /añadir/i }))

    await waitFor(() =>
      expect(posted).toEqual({
        dashboard: 'd1',
        dataset: 'ds1',
        chart_type: 'kpi',
        config: {
          agg: 'count',
          title: 'Total de registros',
          size: 'small',
        },
      }),
    )
  })
})
