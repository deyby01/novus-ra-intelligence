import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import type { Widget } from '../types'
import { KpiWidget } from './kpi-widget'

const KPI: Widget = {
  id: 'w1',
  dashboard: 'd1',
  dataset: 'ds1',
  chart_type: 'kpi',
  config: { agg: 'sum', metric: 'units', title: 'Ingresos', size: 'small' },
  position: null,
  created_at: '2026-07-08T00:00:00Z',
  updated_at: '2026-07-08T00:00:00Z',
}

function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

const singleValue = {
  aggregation: 'sum',
  metric: 'units',
  group_by: null,
  results: [{ group: null, value: 53 }],
}

describe('KpiWidget', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  it('renders the value and a sparkline when the dataset has a date field', async () => {
    server.use(
      http.get('*/dataset-fields/', () =>
        HttpResponse.json(
          page([
            {
              id: 'f1',
              dataset: 'ds1',
              key: 'sold_at',
              label: 'Sold at',
              field_type: 'date',
              order: 0,
            },
          ]),
        ),
      ),
      http.get('*/datasets/ds1/aggregate/', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('bucket') === 'month') {
          return HttpResponse.json({
            aggregation: 'sum',
            metric: 'units',
            group_by: 'sold_at',
            results: [
              { group: '2026-01', value: 10 },
              { group: '2026-02', value: 25 },
              { group: '2026-03', value: 18 },
            ],
          })
        }
        return HttpResponse.json(singleValue)
      }),
    )

    renderWithProviders(<KpiWidget widget={KPI} />)

    expect(await screen.findByText('53')).toBeInTheDocument()
    await waitFor(() =>
      expect(document.querySelector('polyline')).not.toBeNull(),
    )
  })

  it('shows "Sin configurar" for a widget whose config has no aggregation', async () => {
    // A free-form widget config can be empty; it must not crash the dashboard.
    const empty = { ...KPI, config: {} } as Widget
    renderWithProviders(<KpiWidget widget={empty} />)

    expect(await screen.findByText(/sin configurar/i)).toBeInTheDocument()
  })

  it('renders only the value when the dataset has no date field', async () => {
    server.use(
      http.get('*/dataset-fields/', () => HttpResponse.json(page([]))),
      http.get('*/datasets/ds1/aggregate/', () =>
        HttpResponse.json(singleValue),
      ),
    )

    renderWithProviders(<KpiWidget widget={KPI} />)

    expect(await screen.findByText('53')).toBeInTheDocument()
    expect(document.querySelector('polyline')).toBeNull()
  })
})
