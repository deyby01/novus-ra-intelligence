import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import type { DatasetField, DatasetRow, DatasetOverview } from '../types'
import { DatasetDetailPage } from './dataset-detail-page'

const DATASET = {
  id: 'd1',
  name: 'Sales',
  description: '',
  source: 'excel',
  created_by: null,
  updated_by: null,
  created_at: '2026-07-08T00:00:00Z',
  updated_at: '2026-07-08T00:00:00Z',
}

/** A minimal overview with a KPI and a bar chart. */
const OVERVIEW_WITH_WIDGETS: DatasetOverview = {
  headline: {
    row_count: 42,
    field_count: 3,
    numeric_field_count: 1,
    generated_at: '2026-07-11T00:00:00Z',
  },
  widgets: [
    {
      chart_type: 'kpi',
      config: {
        agg: 'count',
        metric: null,
        group_by: null,
        title: 'Total records',
        size: 'small',
      },
      aggregation: 'count',
      metric: null,
      group_by: null,
      results: [{ group: null, value: 42 }],
    },
    {
      chart_type: 'bar',
      config: {
        agg: 'count',
        metric: null,
        group_by: 'region',
        title: 'Records by region',
        size: 'medium',
      },
      aggregation: 'count',
      metric: null,
      group_by: 'region',
      results: [
        { group: 'North', value: 10 },
        { group: 'South', value: 32 },
      ],
    },
  ],
}

const EMPTY_OVERVIEW: DatasetOverview = {
  headline: {
    row_count: 0,
    field_count: 0,
    numeric_field_count: 0,
    generated_at: '2026-07-11T00:00:00Z',
  },
  widgets: [],
}

function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

function field(
  overrides: Partial<DatasetField> & Pick<DatasetField, 'id'>,
): DatasetField {
  return {
    dataset: 'd1',
    key: overrides.id,
    label: overrides.id,
    field_type: 'text',
    order: 0,
    ...overrides,
  }
}

function row(id: string, data: Record<string, unknown>): DatasetRow {
  return {
    id,
    dataset: 'd1',
    data,
    created_at: '2026-07-08T00:00:00Z',
    updated_at: '2026-07-08T00:00:00Z',
  }
}

function stub({
  fields = [],
  rows = [],
  overview = OVERVIEW_WITH_WIDGETS,
}: {
  fields?: DatasetField[]
  rows?: DatasetRow[]
  overview?: DatasetOverview
}) {
  server.use(
    http.get('*/datasets/d1/', () => HttpResponse.json(DATASET)),
    http.get('*/dataset-fields/', () => HttpResponse.json(page(fields))),
    http.get('*/dataset-rows/', () => HttpResponse.json(page(rows))),
    http.get('*/datasets/d1/overview/', () => HttpResponse.json(overview)),
    http.get('*/reports/', () => HttpResponse.json(page([]))),
  )
}

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/datasets/:datasetId" element={<DatasetDetailPage />} />
    </Routes>,
    { route: '/datasets/d1' },
  )
}

describe('DatasetDetailPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  // ── Overview tab (default) ─────────────────────────────────

  it('renders the Overview tab by default with KPI and chart widgets', async () => {
    stub({
      fields: [
        field({ id: 'f1', key: 'region', label: 'Region' }),
        field({ id: 'f2', key: 'units', label: 'Units', field_type: 'number' }),
      ],
      rows: [row('r1', { region: 'North', units: 42 })],
    })
    renderDetail()

    // Dataset title renders
    expect(await screen.findByText('Sales')).toBeInTheDocument()

    // KPI widget title renders
    expect(screen.getByText('Total records')).toBeInTheDocument()

    // Bar chart title renders
    expect(screen.getByText('Records by region')).toBeInTheDocument()

    // The AI panel renders in the overview (checking for the heading text).
    // Use findByText because useReports is async and shows a loading state first.
    expect(await screen.findByText('AI-Powered Insights')).toBeInTheDocument()
  })

  it('shows an overview empty state when widgets list is empty', async () => {
    stub({
      fields: [field({ id: 'f1', key: 'region', label: 'Region' })],
      rows: [],
      overview: EMPTY_OVERVIEW,
    })
    renderDetail()

    expect(
      await screen.findByText(/not enough data yet to summarize/i),
    ).toBeInTheDocument()
  })

  it('shows an overview error state when the overview request fails', async () => {
    server.use(
      http.get('*/datasets/d1/', () => HttpResponse.json(DATASET)),
      http.get('*/dataset-fields/', () => HttpResponse.json(page([]))),
      http.get('*/dataset-rows/', () => HttpResponse.json(page([]))),
      http.get(
        '*/datasets/d1/overview/',
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.get('*/reports/', () => HttpResponse.json(page([]))),
    )
    renderDetail()

    expect(
      await screen.findByText(/couldn't build an overview/i),
    ).toBeInTheDocument()
  })

  // ── Data tab ───────────────────────────────────────────────

  it('renders the dataset as a table of fields and rows in the Data tab', async () => {
    stub({
      fields: [
        field({ id: 'f1', key: 'region', label: 'Region' }),
        field({ id: 'f2', key: 'units', label: 'Units', field_type: 'number' }),
        field({
          id: 'f3',
          key: 'active',
          label: 'Active',
          field_type: 'boolean',
        }),
      ],
      rows: [row('r1', { region: 'North', units: 42, active: true })],
    })
    renderDetail()

    expect(await screen.findByText('Sales')).toBeInTheDocument()

    // Switch to Data tab
    await userEvent.click(screen.getByRole('tab', { name: /data/i }))

    expect(screen.getByText('Region')).toBeInTheDocument()
    expect(screen.getByText('North')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })

  it('renders "No" for false and a dash for blank cells', async () => {
    stub({
      fields: [
        field({
          id: 'f1',
          key: 'active',
          label: 'Active',
          field_type: 'boolean',
        }),
        field({ id: 'f2', key: 'note', label: 'Note' }),
      ],
      rows: [row('r1', { active: false, note: null })],
    })
    renderDetail()

    await screen.findByText('Sales')
    await userEvent.click(screen.getByRole('tab', { name: /data/i }))

    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows an empty state when the dataset has columns but no rows', async () => {
    stub({ fields: [field({ id: 'f1', key: 'region', label: 'Region' })] })
    renderDetail()

    await screen.findByText('Sales')
    await userEvent.click(screen.getByRole('tab', { name: /data/i }))

    expect(await screen.findByText(/no rows yet/i)).toBeInTheDocument()
  })

  it('shows an empty state when the dataset has no columns yet', async () => {
    stub({ fields: [], rows: [] })
    renderDetail()

    await screen.findByText('Sales')
    await userEvent.click(screen.getByRole('tab', { name: /data/i }))

    expect(await screen.findByText(/no columns yet/i)).toBeInTheDocument()
  })

  it('shows an error state when a request fails', async () => {
    server.use(
      http.get('*/datasets/d1/', () => new HttpResponse(null, { status: 500 })),
      http.get('*/dataset-fields/', () => HttpResponse.json(page([]))),
      http.get('*/dataset-rows/', () => HttpResponse.json(page([]))),
      http.get('*/datasets/d1/overview/', () =>
        HttpResponse.json(EMPTY_OVERVIEW),
      ),
      http.get('*/reports/', () => HttpResponse.json(page([]))),
    )
    renderDetail()

    expect(
      await screen.findByText(/couldn't load this dataset/i),
    ).toBeInTheDocument()
  })

  it('adds a row and shows it after the list refetches', async () => {
    let created = false
    server.use(
      http.get('*/datasets/d1/', () => HttpResponse.json(DATASET)),
      http.get('*/dataset-fields/', () =>
        HttpResponse.json(
          page([field({ id: 'f1', key: 'region', label: 'Region' })]),
        ),
      ),
      http.get('*/dataset-rows/', () =>
        HttpResponse.json(
          page(created ? [row('r1', { region: 'North' })] : []),
        ),
      ),
      http.get('*/datasets/d1/overview/', () =>
        HttpResponse.json(OVERVIEW_WITH_WIDGETS),
      ),
      http.get('*/reports/', () => HttpResponse.json(page([]))),
      http.post('*/dataset-rows/', () => {
        created = true
        return HttpResponse.json(row('r1', { region: 'North' }))
      }),
    )
    renderDetail()

    await screen.findByText('Sales')
    await userEvent.click(screen.getByRole('tab', { name: /data/i }))

    await userEvent.click(
      await screen.findByRole('button', { name: /^add row$/i }),
    )
    await userEvent.type(screen.getByLabelText('Region'), 'North')
    await userEvent.click(screen.getByRole('button', { name: /save row/i }))

    expect(await screen.findByText('North')).toBeInTheDocument()
  })

  it('edits a row through the editor', async () => {
    let patched = false
    server.use(
      http.get('*/datasets/d1/', () => HttpResponse.json(DATASET)),
      http.get('*/dataset-fields/', () =>
        HttpResponse.json(
          page([field({ id: 'f1', key: 'region', label: 'Region' })]),
        ),
      ),
      http.get('*/dataset-rows/', () =>
        HttpResponse.json(
          page([row('r1', { region: patched ? 'South' : 'North' })]),
        ),
      ),
      http.get('*/datasets/d1/overview/', () =>
        HttpResponse.json(OVERVIEW_WITH_WIDGETS),
      ),
      http.get('*/reports/', () => HttpResponse.json(page([]))),
      http.patch('*/dataset-rows/r1/', () => {
        patched = true
        return HttpResponse.json(row('r1', { region: 'South' }))
      }),
    )
    renderDetail()

    await screen.findByText('Sales')
    await userEvent.click(screen.getByRole('tab', { name: /data/i }))

    await userEvent.click(
      await screen.findByRole('button', { name: /edit row/i }),
    )
    const input = screen.getByLabelText('Region')
    await userEvent.clear(input)
    await userEvent.type(input, 'South')
    await userEvent.click(screen.getByRole('button', { name: /save row/i }))

    expect(await screen.findByText('South')).toBeInTheDocument()
  })

  it('deletes a row after confirming', async () => {
    let deleted = false
    server.use(
      http.get('*/datasets/d1/', () => HttpResponse.json(DATASET)),
      http.get('*/dataset-fields/', () =>
        HttpResponse.json(
          page([field({ id: 'f1', key: 'region', label: 'Region' })]),
        ),
      ),
      http.get('*/dataset-rows/', () =>
        HttpResponse.json(
          page(deleted ? [] : [row('r1', { region: 'North' })]),
        ),
      ),
      http.get('*/datasets/d1/overview/', () =>
        HttpResponse.json(OVERVIEW_WITH_WIDGETS),
      ),
      http.get('*/reports/', () => HttpResponse.json(page([]))),
      http.delete('*/dataset-rows/r1/', () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderDetail()

    await screen.findByText('Sales')
    await userEvent.click(screen.getByRole('tab', { name: /data/i }))

    await userEvent.click(
      await screen.findByRole('button', { name: /delete row/i }),
    )
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))

    expect(await screen.findByText(/no rows yet/i)).toBeInTheDocument()
  })

  it('surfaces an error when a delete fails', async () => {
    server.use(
      http.get('*/datasets/d1/', () => HttpResponse.json(DATASET)),
      http.get('*/dataset-fields/', () =>
        HttpResponse.json(
          page([field({ id: 'f1', key: 'region', label: 'Region' })]),
        ),
      ),
      http.get('*/dataset-rows/', () =>
        HttpResponse.json(page([row('r1', { region: 'North' })])),
      ),
      http.get('*/datasets/d1/overview/', () =>
        HttpResponse.json(OVERVIEW_WITH_WIDGETS),
      ),
      http.get('*/reports/', () => HttpResponse.json(page([]))),
      http.delete(
        '*/dataset-rows/r1/',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    renderDetail()

    await screen.findByText('Sales')
    await userEvent.click(screen.getByRole('tab', { name: /data/i }))

    await userEvent.click(
      await screen.findByRole('button', { name: /delete row/i }),
    )
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))

    expect(
      await screen.findByText(/couldn't delete the row/i),
    ).toBeInTheDocument()
    expect(screen.getByText('North')).toBeInTheDocument()
  })
})
