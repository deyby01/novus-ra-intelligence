import { AlertCircle } from 'lucide-react'
import {
  useDatasetAggregation,
  useKpiTrend,
  useWidgetMutations,
} from '../hooks'
import type { Widget } from '../types'
import { widgetTitle } from '../utils'
import { Sparkline } from './sparkline'
import { WidgetMenu } from './widget-menu'

/**
 * A compact KPI card: its label, the aggregated value, and — only when the
 * dataset has a date field — a real month-bucketed sparkline of that measure.
 * No variation pill: our datasets have no guaranteed period, so a "vs previous"
 * delta isn't well-defined and we don't fabricate one.
 */
export function KpiWidget({
  widget,
  onEdit,
}: {
  widget: Widget
  onEdit: () => void
}) {
  const configured = Boolean(widget.config.agg)
  const value = useDatasetAggregation(
    {
      datasetId: widget.dataset,
      agg: widget.config.agg,
      metric: widget.config.metric,
      group_by: widget.config.group_by,
    },
    { enabled: configured },
  )
  const trend = useKpiTrend(widget)
  const { remove } = useWidgetMutations(widget.dashboard)

  const handleDelete = () => {
    if (window.confirm('¿Eliminar este widget?')) remove.mutate(widget.id)
  }

  const number = value.data?.results[0]?.value
  const series =
    trend.hasTrend && trend.data
      ? trend.data.results.map((entry) => entry.value ?? 0)
      : []

  return (
    <div className="border-g200 flex h-full flex-col rounded-2xl border bg-white p-4 sm:p-[17px]">
      <div className="flex items-center justify-between">
        <span className="text-g500 truncate pr-2 text-[10.5px] font-semibold tracking-[0.05em] uppercase">
          {widgetTitle(widget)}
        </span>
        <WidgetMenu
          onEdit={onEdit}
          onDelete={handleDelete}
          disabled={remove.isPending}
        />
      </div>

      {!configured ? (
        <div className="text-g400 mt-3 text-[12.5px]">Sin configurar</div>
      ) : value.isPending ? (
        <div className="bg-g100 mt-3 h-8 w-24 animate-pulse rounded-md" />
      ) : value.isError ? (
        <div className="text-g400 mt-3 flex items-center gap-1.5 text-[12.5px]">
          <AlertCircle className="size-4" strokeWidth={1.5} />
          No se pudo cargar
        </div>
      ) : (
        <div className="font-display text-g900 mt-2 text-[27px] font-semibold tracking-[-0.02em]">
          {number != null ? number.toLocaleString() : '—'}
        </div>
      )}

      {series.length >= 2 && (
        <Sparkline values={series} className="mt-auto h-[22px] w-full pt-2.5" />
      )}
    </div>
  )
}
