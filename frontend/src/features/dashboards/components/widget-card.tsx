import { AlertCircle, Loader2 } from 'lucide-react'
import { useDatasetAggregation, useWidgetMutations } from '../hooks'
import type { Widget } from '../types'
import { widgetTitle } from '../utils'
import { ChartRenderer } from './chart-renderer'
import { KpiWidget } from './kpi-widget'
import { WidgetMenu } from './widget-menu'

/** A dashboard widget. KPIs get a compact card; everything else charts its data. */
export function WidgetCard({ widget }: { widget: Widget }) {
  if (widget.chart_type === 'kpi') return <KpiWidget widget={widget} />
  return <ChartWidgetCard widget={widget} />
}

function ChartWidgetCard({ widget }: { widget: Widget }) {
  const configured = Boolean(widget.config.agg)
  const { data, isPending, isError } = useDatasetAggregation(
    {
      datasetId: widget.dataset,
      agg: widget.config.agg,
      metric: widget.config.metric,
      group_by: widget.config.group_by,
      bucket: widget.config.bucket,
    },
    { enabled: configured },
  )
  const { remove } = useWidgetMutations(widget.dashboard)

  const handleDelete = () => {
    if (window.confirm('¿Eliminar este widget?')) remove.mutate(widget.id)
  }

  return (
    <div className="border-g200 flex h-full flex-col rounded-2xl border bg-white p-5 sm:p-[21px]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-display text-g900 truncate pr-2 text-[16px] font-semibold tracking-[-0.01em]">
          {widgetTitle(widget)}
        </h3>
        <WidgetMenu onDelete={handleDelete} disabled={remove.isPending} />
      </div>

      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        {!configured && (
          <p className="text-g400 text-[12.5px]">Sin configurar</p>
        )}
        {configured && isPending && (
          <Loader2
            className="text-g300 size-8 animate-spin"
            strokeWidth={1.5}
          />
        )}
        {configured && !isPending && isError && (
          <div className="text-g400 flex flex-col items-center gap-2">
            <AlertCircle className="size-7" strokeWidth={1.5} />
            <p className="text-[12.5px]">No se pudieron cargar los datos</p>
          </div>
        )}
        {configured && !isPending && !isError && data && (
          <div className="h-full w-full">
            <ChartRenderer
              type={widget.chart_type}
              data={data}
              size={widget.config.size}
            />
          </div>
        )}
      </div>
    </div>
  )
}
