import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import { useDatasetOverview } from './hooks'
import type { DatasetOverview } from './types'

const OVERVIEW: DatasetOverview = {
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
        title: 'Total rows',
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
        agg: 'sum',
        metric: 'units',
        group_by: 'region',
        title: 'Units by region',
        size: 'medium',
      },
      aggregation: 'sum',
      metric: 'units',
      group_by: 'region',
      results: [
        { group: 'North', value: 10 },
        { group: 'South', value: 20 },
      ],
    },
  ],
}

/** Tiny probe that surfaces the hook's state as text for assertions. */
function OverviewProbe({ id }: { id: string }) {
  const { data, fetchStatus } = useDatasetOverview(id)
  if (!data) return <span>status:{fetchStatus}</span>
  return (
    <div>
      <span>rows:{data.headline.row_count}</span>
      <ul>
        {data.widgets.map((w) => (
          <li key={w.config.title}>{w.config.title}</li>
        ))}
      </ul>
    </div>
  )
}

describe('useDatasetOverview', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
  })

  it('returns the headline and widgets from the overview endpoint', async () => {
    useWorkspaceStore.getState().setCurrentOrganization('org-1')
    server.use(
      http.get('*/datasets/d1/overview/', () => HttpResponse.json(OVERVIEW)),
    )

    renderWithProviders(<OverviewProbe id="d1" />)

    expect(await screen.findByText('rows:42')).toBeInTheDocument()
    expect(screen.getByText('Total rows')).toBeInTheDocument()
    expect(screen.getByText('Units by region')).toBeInTheDocument()
  })

  it('does not fetch when no organization is selected', () => {
    // No org set: the query is disabled, so no handler is registered and MSW's
    // onUnhandledRequest: 'error' would surface any accidental request.
    renderWithProviders(<OverviewProbe id="d1" />)

    expect(screen.getByText('status:idle')).toBeInTheDocument()
    expect(screen.queryByText('Total rows')).not.toBeInTheDocument()
  })
})
