import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import type { ImportJob } from '../types'

import { ImportDatasetPage } from './import-dataset-page'

function excelFile(name = 'sales.xlsx') {
  return new File(['<binary>'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function importJob(overrides: Partial<ImportJob>): ImportJob {
  return {
    id: 'j1',
    dataset: 'd1',
    status: 'pending',
    rows_processed: 0,
    errors: {},
    created_at: '2026-07-08T00:00:00Z',
    updated_at: '2026-07-08T00:00:00Z',
    ...overrides,
  }
}

function stubCreateEndpoints(finalJob: ImportJob) {
  server.use(
    http.post('*/datasets/', () =>
      HttpResponse.json({
        id: 'd1',
        name: 'Sales',
        description: '',
        source: 'excel',
        created_by: null,
        updated_by: null,
        created_at: '',
        updated_at: '',
      }),
    ),
    http.post('*/import-jobs/', () =>
      HttpResponse.json(importJob({ status: 'pending' })),
    ),
    http.get('*/import-jobs/:id/', () => HttpResponse.json(finalJob)),
  )
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText('Dataset name'), 'Sales')
  await userEvent.upload(screen.getByLabelText('Excel file'), excelFile())
  await userEvent.click(screen.getByRole('button', { name: /^import$/i }))
}

describe('ImportDatasetPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  it('asks for a file before importing', async () => {
    renderWithProviders(<ImportDatasetPage />)

    await userEvent.type(screen.getByLabelText('Dataset name'), 'Sales')
    await userEvent.click(screen.getByRole('button', { name: /^import$/i }))

    expect(await screen.findByText(/choose an excel file/i)).toBeInTheDocument()
  })

  it('rejects a non-Excel file without hitting the API', async () => {
    let apiCalled = false
    server.use(
      http.post('*/datasets/', () => {
        apiCalled = true
        return HttpResponse.json({})
      }),
      http.post('*/import-jobs/', () => {
        apiCalled = true
        return HttpResponse.json({})
      }),
    )
    renderWithProviders(<ImportDatasetPage />)

    await userEvent.type(screen.getByLabelText('Dataset name'), 'Sales')
    await userEvent.upload(
      screen.getByLabelText('Excel file'),
      new File(['data'], 'notes.txt', { type: 'text/plain' }),
      { applyAccept: false },
    )
    await userEvent.click(screen.getByRole('button', { name: /^import$/i }))

    expect(
      await screen.findByText(/must be an excel workbook/i),
    ).toBeInTheDocument()
    expect(apiCalled).toBe(false)
  })

  it('imports the spreadsheet and reports how many rows landed', async () => {
    stubCreateEndpoints(importJob({ status: 'done', rows_processed: 42 }))
    renderWithProviders(<ImportDatasetPage />)

    await fillAndSubmit()

    expect(await screen.findByText(/import complete/i)).toBeInTheDocument()
    expect(screen.getByText(/42 rows imported/i)).toBeInTheDocument()
  })

  it('surfaces the failure when the import errors', async () => {
    stubCreateEndpoints(
      importJob({ status: 'error', errors: { detail: 'Corrupt workbook' } }),
    )
    renderWithProviders(<ImportDatasetPage />)

    await fillAndSubmit()

    expect(await screen.findByText(/import failed/i)).toBeInTheDocument()
    expect(screen.getByText('Corrupt workbook')).toBeInTheDocument()
  })
})
