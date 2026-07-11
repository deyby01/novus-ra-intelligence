import {
  ChartRenderer,
  chartHeight,
} from '@/features/dashboards/components/chart-renderer'
import type { AggregationResult } from '@/features/dashboards/types'
import type { OverviewWidget } from '../types'

/**
 * Render a single backend-computed overview widget. Unlike `WidgetCard`, it
 * charts the embedded `widget.results` directly, so it fires no requests and
 * has no delete affordance or loading/error states.
 */
export function OverviewWidgetCard({ widget }: { widget: OverviewWidget }) {
  const data: AggregationResult = {
    aggregation: widget.aggregation,
    metric: widget.metric,
    group_by: widget.group_by,
    results: widget.results,
  }

  return (
    <div className="flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="p-4 pb-2 sm:p-6 sm:pb-2">
        <h3 className="truncate text-sm font-semibold leading-none tracking-tight sm:text-base">
          {widget.config.title}
        </h3>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 pt-0 sm:p-6 sm:pt-0">
        <div
          className="w-full"
          style={{ height: chartHeight(widget.config.size) }}
        >
          <ChartRenderer
            type={widget.chart_type}
            data={data}
            size={widget.config.size}
          />
        </div>
      </div>
    </div>
  )
}
