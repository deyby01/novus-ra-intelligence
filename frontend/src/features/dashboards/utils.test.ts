import { describe, expect, it } from 'vitest'
import type { Widget } from './types'
import { widgetSpan, widgetTitle } from './utils'

function makeWidget(overrides: Partial<Widget> = {}): Widget {
  return {
    id: 'w',
    dashboard: 'd',
    dataset: 'ds',
    chart_type: 'bar',
    config: { agg: 'sum', metric: 'x', title: 'T', size: 'medium' },
    position: null,
    order: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

describe('widgetSpan', () => {
  it('uses the persisted position when it has been resized', () => {
    expect(widgetSpan(makeWidget({ position: { w: 4, h: 5 } }))).toEqual({
      w: 4,
      h: 5,
    })
  })

  it('clamps an out-of-range position to the grid', () => {
    expect(widgetSpan(makeWidget({ position: { w: 99, h: 1 } }))).toEqual({
      w: 6,
      h: 3,
    })
  })

  it('falls back to a size-derived default without a position', () => {
    expect(
      widgetSpan(makeWidget({ config: { agg: 'sum', size: 'large' } })),
    ).toEqual({ w: 6, h: 9 })
  })

  it('gives KPIs a compact default regardless of size', () => {
    expect(
      widgetSpan(
        makeWidget({
          chart_type: 'kpi',
          config: { agg: 'count', size: 'small' },
        }),
      ),
    ).toEqual({ w: 2, h: 4 })
  })
})

describe('widgetTitle', () => {
  it('prefers the widget config title', () => {
    expect(widgetTitle(makeWidget())).toBe('T')
  })

  it('stays safe when the config has no aggregation', () => {
    expect(widgetTitle(makeWidget({ config: {} as Widget['config'] }))).toBe(
      'Widget',
    )
  })
})
