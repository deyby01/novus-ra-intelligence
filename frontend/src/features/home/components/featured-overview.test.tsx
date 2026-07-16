import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import type { Dataset, DatasetOverview } from '@/features/datasets/types'
import type { Report } from '@/features/reports/types'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import { FeaturedOverview } from './featured-overview'

/** Empty page, so the report query resolves cleanly when a test ignores it. */
function reportsPage(results: Report[] = []) {
  return { count: results.length, next: null, previous: null, results }
}

function makeReport(overrides: Partial<Report> & Pick<Report, 'id'>): Report {
  return {
    dataset: 'd1',
    dataset_name: 'Ventas Q3',
    status: 'COMPLETED',
    content: '',
    error_message: '',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
    ...overrides,
  }
}

const dataset: Dataset = {
  id: 'd1',
  name: 'Ventas Q3',
  description: '',
  source: 'excel',
  row_count: 1662,
  created_by: null,
  updated_by: null,
  created_at: '2026-07-10T00:00:00Z',
  updated_at: '2026-07-10T00:00:00Z',
}

/** A schema-driven overview, as the backend derives it from the imported file. */
const overview: DatasetOverview = {
  headline: {
    row_count: 1662,
    field_count: 5,
    numeric_field_count: 2,
    generated_at: new Date().toISOString(),
  },
  widgets: [
    {
      chart_type: 'kpi',
      config: {
        agg: 'count',
        metric: null,
        group_by: null,
        title: 'Total registros',
        size: 'small',
      },
      aggregation: 'count',
      metric: null,
      group_by: null,
      results: [{ group: null, value: 1662 }],
    },
    {
      chart_type: 'kpi',
      config: {
        agg: 'sum',
        metric: 'ingresos',
        group_by: null,
        title: 'Suma de ingresos',
        size: 'small',
      },
      aggregation: 'sum',
      metric: 'ingresos',
      group_by: null,
      results: [{ group: null, value: 142850 }],
    },
    {
      chart_type: 'bar',
      config: {
        agg: 'sum',
        metric: 'ingresos',
        group_by: 'mes',
        title: 'Ingresos por mes',
        size: 'medium',
      },
      aggregation: 'sum',
      metric: 'ingresos',
      group_by: 'mes',
      results: [
        { group: 'ene', value: 20 },
        { group: 'jun', value: 40 },
      ],
    },
  ],
}

describe('FeaturedOverview', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
    // The component also lists the dataset's reports for the AI reading; by
    // default there are none, so the block shows its generate CTA.
    server.use(http.get('*/reports/', () => HttpResponse.json(reportsPage())))
  })

  it('renders KPIs and the chart derived from the dataset schema', async () => {
    server.use(
      http.get('*/datasets/d1/overview/', () => HttpResponse.json(overview)),
    )
    renderWithProviders(<FeaturedOverview dataset={dataset} />)

    // Await the KPI, not the header: the header paints before the query lands.
    expect(await screen.findByText('Total registros')).toBeInTheDocument()
    expect(screen.getByText('Overview · Ventas Q3')).toBeInTheDocument()
    // KPI titles + values come from the backend, not from a fixed list.
    expect(screen.getByText('1.662')).toBeInTheDocument()
    expect(screen.getByText('Suma de ingresos')).toBeInTheDocument()
    expect(screen.getByText('142.850')).toBeInTheDocument()
    // The chart uses the auto-picked series and its group range.
    expect(screen.getByText('Ingresos por mes')).toBeInTheDocument()
    expect(screen.getByText('ene – jun')).toBeInTheDocument()
    expect(screen.getByText(/1\.662 filas/)).toBeInTheDocument()
  })

  it('adapts to a different schema without any hardcoded labels', async () => {
    server.use(
      http.get('*/datasets/d1/overview/', () =>
        HttpResponse.json({
          headline: { ...overview.headline, row_count: 7 },
          widgets: [
            {
              chart_type: 'kpi',
              config: {
                agg: 'avg',
                metric: 'stock',
                group_by: null,
                title: 'Promedio de stock',
                size: 'small',
              },
              aggregation: 'avg',
              metric: 'stock',
              group_by: null,
              results: [{ group: null, value: 12.5 }],
            },
          ],
        }),
      ),
    )
    renderWithProviders(<FeaturedOverview dataset={dataset} />)

    expect(await screen.findByText('Promedio de stock')).toBeInTheDocument()
    expect(screen.getByText('12,5')).toBeInTheDocument()
    expect(screen.queryByText('Total registros')).not.toBeInTheDocument()
  })

  it('invites an import when the workspace has no dataset to feature', () => {
    renderWithProviders(<FeaturedOverview dataset={undefined} />)

    expect(
      screen.getByText(/aún no hay nada que analizar/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /importar excel/i }),
    ).toBeInTheDocument()
  })

  it('explains when the dataset has no data for an overview yet', async () => {
    server.use(
      http.get('*/datasets/d1/overview/', () =>
        HttpResponse.json({
          headline: {
            row_count: 0,
            field_count: 0,
            numeric_field_count: 0,
            generated_at: new Date().toISOString(),
          },
          widgets: [],
        }),
      ),
    )
    renderWithProviders(<FeaturedOverview dataset={dataset} />)

    expect(
      await screen.findByText(/todavía no tiene datos suficientes/i),
    ).toBeInTheDocument()
  })

  it('shows an error state when the overview cannot be built', async () => {
    server.use(
      http.get(
        '*/datasets/d1/overview/',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    renderWithProviders(<FeaturedOverview dataset={dataset} />)

    expect(
      await screen.findByText(/no pudimos generar el overview/i),
    ).toBeInTheDocument()
  })

  it("reads the excerpt of the dataset's latest completed report", async () => {
    server.use(
      http.get('*/datasets/d1/overview/', () => HttpResponse.json(overview)),
      http.get('*/reports/', () =>
        HttpResponse.json(
          reportsPage([
            makeReport({
              id: 'r1',
              status: 'COMPLETED',
              content:
                '## Resumen\n\nLas ventas crecieron un 12% este trimestre. Norte lideró.',
            }),
          ]),
        ),
      ),
    )
    renderWithProviders(<FeaturedOverview dataset={dataset} />)

    expect(
      await screen.findByText(
        /las ventas crecieron un 12% este trimestre\. norte lideró\./i,
      ),
    ).toBeInTheDocument()
  })

  it('keeps the generate CTA when no completed report exists yet', async () => {
    server.use(
      http.get('*/datasets/d1/overview/', () => HttpResponse.json(overview)),
      http.get('*/reports/', () =>
        HttpResponse.json(
          reportsPage([makeReport({ id: 'r1', status: 'PENDING' })]),
        ),
      ),
    )
    renderWithProviders(<FeaturedOverview dataset={dataset} />)

    // The AI block appears (overview has widgets) but still invites a report.
    expect(
      await screen.findByText(/genera un reporte de este dataset/i),
    ).toBeInTheDocument()
  })
})
