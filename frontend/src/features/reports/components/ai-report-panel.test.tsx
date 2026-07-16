import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import { reportsApi } from '../api'
import type { Report } from '../types'
import { AiReportPanel } from './ai-report-panel'

function report(
  overrides: Partial<Report> & Pick<Report, 'id' | 'status'>,
): Report {
  return {
    dataset: 'd1',
    dataset_name: 'Sales sample',
    content: '## Executive Summary\n\nRevenue is up.',
    error_message: '',
    created_at: '2026-07-08T00:00:00Z',
    updated_at: '2026-07-08T00:00:00Z',
    ...overrides,
  }
}

function stubReports(reports: Report[]) {
  server.use(
    http.get('*/reports/', () =>
      HttpResponse.json({
        count: reports.length,
        next: null,
        previous: null,
        results: reports,
      }),
    ),
    http.get('*/reports/:id/', ({ params }) => {
      const found = reports.find((r) => r.id === params.id)
      return found
        ? HttpResponse.json(found)
        : new HttpResponse(null, { status: 404 })
    }),
  )
}

describe('AiReportPanel', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders export affordances for a completed report', async () => {
    stubReports([report({ id: 'r1', status: 'COMPLETED' })])

    renderWithProviders(<AiReportPanel datasetId="d1" datasetName="Sales" />)

    // The rendered report body appears once the completed report resolves.
    expect(await screen.findByText(/Executive Summary/i)).toBeInTheDocument()

    // Export PDF is an enabled control.
    const exportButton = screen.getByRole('button', { name: /export pdf/i })
    expect(exportButton).toBeInTheDocument()
    expect(exportButton).toBeEnabled()

    // Email is presented as an upcoming, disabled control.
    const emailButton = screen.getByRole('button', {
      name: /email report \(coming soon\)/i,
    })
    expect(emailButton).toBeDisabled()
    expect(screen.getByText(/soon/i)).toBeInTheDocument()
  })

  it('downloads a PDF blob when Export PDF is clicked', async () => {
    stubReports([report({ id: 'r1', status: 'COMPLETED' })])
    const blob = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], {
      type: 'application/pdf',
    })
    const downloadSpy = vi
      .spyOn(reportsApi, 'downloadPdf')
      .mockResolvedValue(blob)
    const createUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock')
    const revokeUrl = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {})
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    renderWithProviders(<AiReportPanel datasetId="d1" datasetName="Sales" />)

    const exportButton = await screen.findByRole('button', {
      name: /export pdf/i,
    })
    await userEvent.click(exportButton)

    expect(downloadSpy).toHaveBeenCalledWith('r1')
    expect(createUrl).toHaveBeenCalledWith(blob)
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeUrl).toHaveBeenCalledWith('blob:mock')
  })

  it('offers a generate action when no report exists yet', async () => {
    stubReports([])

    renderWithProviders(<AiReportPanel datasetId="d1" datasetName="Sales" />)

    expect(
      await screen.findByRole('button', { name: /generate insights/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /export pdf/i }),
    ).not.toBeInTheDocument()
  })
})
