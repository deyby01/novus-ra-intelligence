import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import type { OverviewWidget } from '../types'
import { OverviewWidgetCard } from './overview-widget-card'

function widget(overrides: Partial<OverviewWidget> = {}): OverviewWidget {
  return {
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
    results: [{ group: null, value: 1234 }],
    ...overrides,
  }
}

describe('OverviewWidgetCard', () => {
  it('renders the config title', () => {
    renderWithProviders(<OverviewWidgetCard widget={widget()} />)

    expect(screen.getByText('Total rows')).toBeInTheDocument()
  })

  it('renders a kpi value from the embedded results', () => {
    renderWithProviders(<OverviewWidgetCard widget={widget()} />)

    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('renders a Recharts container for a bar widget without loading or error states', () => {
    const { container } = renderWithProviders(
      <OverviewWidgetCard
        widget={widget({
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
        })}
      />,
    )

    expect(screen.getByText('Units by region')).toBeInTheDocument()
    expect(
      container.querySelector('.recharts-responsive-container'),
    ).not.toBeNull()
    expect(screen.queryByText(/failed to load/i)).not.toBeInTheDocument()
    expect(container.querySelector('.animate-spin')).toBeNull()
  })

  it('renders a Recharts container for pie and line widgets', () => {
    for (const chartType of ['pie', 'line'] as const) {
      const { container, unmount } = renderWithProviders(
        <OverviewWidgetCard
          widget={widget({
            chart_type: chartType,
            config: {
              agg: 'avg',
              metric: 'score',
              group_by: 'team',
              title: `Score by team (${chartType})`,
              size: 'large',
            },
            aggregation: 'avg',
            metric: 'score',
            group_by: 'team',
            results: [
              { group: 'A', value: 3 },
              { group: 'B', value: 7 },
            ],
          })}
        />,
      )

      expect(
        screen.getByText(`Score by team (${chartType})`),
      ).toBeInTheDocument()
      expect(
        container.querySelector('.recharts-responsive-container'),
      ).not.toBeNull()
      unmount()
    }
  })

  it('shows no delete or menu button (renders from props, no network)', () => {
    renderWithProviders(<OverviewWidgetCard widget={widget()} />)

    // The card is purely presentational: no dropdown menu, no delete affordance.
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByText(/delete widget/i)).not.toBeInTheDocument()
  })
})
