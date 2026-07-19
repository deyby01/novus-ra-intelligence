import { Check, Database, Loader2, Plus, Sparkles, Upload } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useDatasetOverview, useDatasets } from '@/features/datasets/hooks'
import type { OverviewWidget } from '@/features/datasets/types'
import { formatNumber } from '@/features/home/utils'
import { useWidgetMutations } from '../hooks'
import type { ChartType, WidgetConfig } from '../types'

const CHART_LABELS: Record<ChartType, string> = {
  kpi: 'KPI',
  bar: 'Barras',
  pie: 'Circular',
  line: 'Línea',
  table: 'Tabla',
}

/**
 * Suggest widgets for a dashboard from a dataset's deterministic overview (the
 * same engine that powers AI dashboard generation). The user picks a dataset
 * and adds any of the proposed KPIs/charts; each drops straight into a real
 * widget, so nothing suggested is a chart the product can't build.
 */
export function SuggestWidgetDialog({
  dashboardId,
  children,
}: {
  dashboardId: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="bg-g900 mb-1 grid size-11 place-items-center rounded-[13px] text-white">
            <Sparkles className="size-5" strokeWidth={1.5} />
          </div>
          <DialogTitle className="font-display">
            Sugerir widgets con IA
          </DialogTitle>
          <DialogDescription>
            Elige un dataset y añade los KPIs y gráficos que la IA propone a
            partir de sus datos.
          </DialogDescription>
        </DialogHeader>
        {open && <SuggestBody dashboardId={dashboardId} />}
      </DialogContent>
    </Dialog>
  )
}

function SuggestBody({ dashboardId }: { dashboardId: string }) {
  const { data: datasets, isPending: datasetsPending } = useDatasets()
  const [datasetId, setDatasetId] = useState<string | null>(null)
  const overview = useDatasetOverview(datasetId ?? '')
  const { create } = useWidgetMutations(dashboardId)
  const [added, setAdded] = useState<Record<string, boolean>>({})

  const addWidget = (spec: OverviewWidget, key: string) => {
    const config: WidgetConfig = {
      agg: spec.config.agg,
      metric: spec.config.metric ?? undefined,
      group_by: spec.config.group_by ?? undefined,
      title: spec.config.title,
      size: spec.config.size,
      bucket: spec.config.bucket,
    }
    create.mutate(
      {
        dashboard: dashboardId,
        dataset: datasetId as string,
        chart_type: spec.chart_type,
        config,
      },
      { onSuccess: () => setAdded((prev) => ({ ...prev, [key]: true })) },
    )
  }

  if (!datasetsPending && datasets?.length === 0) {
    return (
      <div className="border-g200 flex flex-col items-center gap-2 rounded-[14px] border bg-white px-4 py-8 text-center">
        <span className="bg-g100 text-g600 grid size-11 place-items-center rounded-[13px]">
          <Database className="size-5" strokeWidth={1.5} />
        </span>
        <p className="text-g500 text-[13px]">
          Importa un dataset primero para que la IA tenga con qué trabajar.
        </p>
        <Link
          to="/datasets/import"
          className="bg-g900 font-display hover:bg-g800 mt-1 inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[13px] font-semibold text-white transition-colors"
        >
          <Upload className="size-4" strokeWidth={1.5} />
          Importar Excel
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Dataset picker */}
      {datasets && datasets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {datasets.map((dataset) => {
            const selected = dataset.id === datasetId
            return (
              <button
                key={dataset.id}
                type="button"
                onClick={() => {
                  setDatasetId(dataset.id)
                  setAdded({})
                }}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  selected
                    ? 'border-g900 bg-g900 text-white'
                    : 'border-g200 text-g600 hover:bg-g50'
                }`}
              >
                {dataset.name}
                <span
                  className={selected ? 'text-white/60' : 'text-g400'}
                >{` · ${formatNumber(dataset.row_count)} filas`}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Suggestions */}
      {datasetId && overview.isPending && (
        <div className="text-g400 flex items-center gap-2 py-6 text-[13px]">
          <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
          Analizando el dataset…
        </div>
      )}

      {datasetId && !overview.isPending && overview.data && (
        <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {overview.data.widgets.length === 0 && (
            <p className="text-g500 py-4 text-center text-[13px]">
              Este dataset no tiene suficientes datos para sugerir widgets.
            </p>
          )}
          {overview.data.widgets.map((spec, index) => {
            const key = `${spec.chart_type}-${spec.config.title}-${index}`
            const isAdded = added[key]
            return (
              <div
                key={key}
                className="border-g200 flex items-center justify-between gap-3 rounded-[11px] border px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <span className="font-display text-g900 block truncate text-[13.5px] font-semibold">
                    {spec.config.title}
                  </span>
                  <span className="text-g400 text-[11.5px]">
                    {CHART_LABELS[spec.chart_type]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => addWidget(spec, key)}
                  disabled={isAdded || create.isPending}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-70 ${
                    isAdded
                      ? 'bg-g100 text-g600'
                      : 'bg-g900 hover:bg-g800 text-white'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="size-[14px]" strokeWidth={1.5} />
                      Añadido
                    </>
                  ) : (
                    <>
                      <Plus className="size-[14px]" strokeWidth={1.5} />
                      Añadir
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
