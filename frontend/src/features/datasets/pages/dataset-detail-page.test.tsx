import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import type { DatasetField, DatasetRow } from '../types'
import { DatasetDetailPage } from './dataset-detail-page'

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
}: {
  fields?: DatasetField[]
  rows?: DatasetRow[]
}) {
  server.use(
    http.get('*/datasets/d1/', () =>
      HttpResponse.json({
        id: 'd1',
        name: 'Sales',
        description: '',
        source: 'excel',
        created_by: null,
        updated_by: null,
        created_at: '2026-07-08T00:00:00Z',
        updated_at: '2026-07-08T00:00:00Z',
      }),
    ),
    http.get('*/dataset-fields/', () => HttpResponse.json(page(fields))),
    http.get('*/dataset-rows/', () => HttpResponse.json(page(rows))),
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

  it('renders the dataset as a table of fields and rows', async () => {
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

    expect(await screen.findByText('No')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows an empty state when the dataset has columns but no rows', async () => {
    stub({ fields: [field({ id: 'f1', key: 'region', label: 'Region' })] })
    renderDetail()

    expect(await screen.findByText(/no rows yet/i)).toBeInTheDocument()
  })

  it('shows an empty state when the dataset has no columns yet', async () => {
    stub({ fields: [], rows: [] })
    renderDetail()

    expect(await screen.findByText(/no columns yet/i)).toBeInTheDocument()
  })

  it('shows an error state when a request fails', async () => {
    server.use(
      http.get('*/datasets/d1/', () => new HttpResponse(null, { status: 500 })),
      http.get('*/dataset-fields/', () => HttpResponse.json(page([]))),
      http.get('*/dataset-rows/', () => HttpResponse.json(page([]))),
    )
    renderDetail()

    expect(
      await screen.findByText(/couldn't load this dataset/i),
    ).toBeInTheDocument()
  })
})
