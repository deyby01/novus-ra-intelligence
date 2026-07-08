import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import type { DatasetField, DatasetRow } from '../types'
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
    http.get('*/datasets/d1/', () => HttpResponse.json(DATASET)),
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
      http.post('*/dataset-rows/', () => {
        created = true
        return HttpResponse.json(row('r1', { region: 'North' }))
      }),
    )
    renderDetail()

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
      http.patch('*/dataset-rows/r1/', () => {
        patched = true
        return HttpResponse.json(row('r1', { region: 'South' }))
      }),
    )
    renderDetail()

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
      http.delete('*/dataset-rows/r1/', () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderDetail()

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
      http.delete(
        '*/dataset-rows/r1/',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    renderDetail()

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
