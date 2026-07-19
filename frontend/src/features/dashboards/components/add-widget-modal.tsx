import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDatasetFields, useDatasets } from '@/features/datasets/hooks'
import { useWidgetMutations } from '../hooks'
import type {
  AggregationFunction,
  ChartType,
  Widget,
  WidgetConfig,
} from '../types'

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'kpi', label: 'KPI (valor único)' },
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Línea' },
  { value: 'pie', label: 'Circular' },
  { value: 'table', label: 'Tabla' },
]

const AGG_FUNCTIONS: { value: AggregationFunction; label: string }[] = [
  { value: 'count', label: 'Conteo (filas)' },
  { value: 'sum', label: 'Suma' },
  { value: 'avg', label: 'Promedio' },
  { value: 'min', label: 'Mínimo' },
  { value: 'max', label: 'Máximo' },
]

interface Props {
  dashboardId: string
  isOpen: boolean
  onClose: () => void
  /** When set, the modal edits this widget's configuration instead of adding one. */
  editWidget?: Widget | null
}

export function AddWidgetModal({
  dashboardId,
  isOpen,
  onClose,
  editWidget,
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        {isOpen && (
          <WidgetForm
            key={editWidget?.id ?? 'new'}
            dashboardId={dashboardId}
            editWidget={editWidget ?? null}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * The widget form. Rendered only while the dialog is open (and keyed by the
 * widget), so it remounts with fresh state prefilled from the widget being
 * edited — no reset effect.
 */
function WidgetForm({
  dashboardId,
  editWidget,
  onClose,
}: {
  dashboardId: string
  editWidget: Widget | null
  onClose: () => void
}) {
  const { data: datasets } = useDatasets()
  const { create, update } = useWidgetMutations(dashboardId)

  const [title, setTitle] = useState(editWidget?.config.title ?? '')
  const [datasetId, setDatasetId] = useState(editWidget?.dataset ?? '')
  const [chartType, setChartType] = useState<ChartType | ''>(
    editWidget?.chart_type ?? '',
  )
  const [agg, setAgg] = useState<AggregationFunction | ''>(
    editWidget?.config.agg ?? '',
  )
  const [metric, setMetric] = useState(editWidget?.config.metric ?? 'none')
  const [groupBy, setGroupBy] = useState(editWidget?.config.group_by ?? 'none')

  const { data: fields } = useDatasetFields(datasetId)
  const numericFields = fields?.filter((f) => f.field_type === 'number') || []

  const requiresMetric = agg !== 'count' && agg !== ''
  const isMetricValid = !requiresMetric || metric !== 'none'
  const isFormValid =
    datasetId !== '' && chartType !== '' && agg !== '' && isMetricValid

  const pending = create.isPending || update.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || pending) return

    const config: WidgetConfig = {
      agg: agg as AggregationFunction,
      ...(metric !== 'none' && { metric }),
      ...(groupBy !== 'none' && { group_by: groupBy }),
      ...(title.trim() && { title: title.trim() }),
      // Keep the widget's size (its default span); new widgets get a sensible one.
      size:
        editWidget?.config.size ?? (chartType === 'kpi' ? 'small' : 'medium'),
      ...(editWidget?.config.bucket && { bucket: editWidget.config.bucket }),
    }

    if (editWidget) {
      update.mutate(
        {
          id: editWidget.id,
          dataset: datasetId,
          chart_type: chartType as ChartType,
          config,
        },
        { onSuccess: onClose },
      )
    } else {
      create.mutate(
        {
          dashboard: dashboardId,
          dataset: datasetId,
          chart_type: chartType as ChartType,
          config,
          position: {},
        },
        { onSuccess: onClose },
      )
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className="font-display">
          {editWidget ? 'Editar widget' : 'Añadir widget'}
        </DialogTitle>
        <DialogDescription>
          Configura un nuevo gráfico o métrica para tu dashboard.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Título (opcional)</Label>
          <Input
            id="title"
            placeholder="Ej. Ventas totales, Ingresos por región…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="dataset">Dataset</Label>
          <Select value={datasetId} onValueChange={setDatasetId}>
            <SelectTrigger id="dataset">
              <SelectValue placeholder="Selecciona un dataset" />
            </SelectTrigger>
            <SelectContent>
              {datasets?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {datasetId && (
          <>
            <div className="grid gap-2">
              <Label htmlFor="chartType">Tipo de gráfico</Label>
              <Select
                value={chartType}
                onValueChange={(val) => setChartType(val as ChartType)}
              >
                <SelectTrigger id="chartType">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="agg">Agregación</Label>
              <Select
                value={agg}
                onValueChange={(val) => setAgg(val as AggregationFunction)}
              >
                <SelectTrigger id="agg">
                  <SelectValue placeholder="Selecciona una agregación" />
                </SelectTrigger>
                <SelectContent>
                  {AGG_FUNCTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requiresMetric && (
              <div className="grid gap-2">
                <Label htmlFor="metric">Métrica (campo numérico)</Label>
                <Select value={metric} onValueChange={setMetric}>
                  <SelectTrigger id="metric">
                    <SelectValue placeholder="Selecciona un campo numérico" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericFields.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No hay campos numéricos
                      </SelectItem>
                    ) : (
                      numericFields.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="groupBy">Agrupar por (opcional)</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger id="groupBy">
                  <SelectValue placeholder="Sin agrupar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {fields?.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {(create.isError || update.isError) && (
          <p className="text-[12.5px] text-red-600">
            No pudimos guardar el widget. Revisa la configuración.
          </p>
        )}
      </div>

      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="text-g600 hover:bg-g100 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold transition-colors disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!isFormValid || pending}
          className="bg-g900 font-display hover:bg-g800 inline-flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors disabled:opacity-60"
        >
          {pending && (
            <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
          )}
          {editWidget ? 'Guardar cambios' : 'Añadir widget'}
        </button>
      </DialogFooter>
    </form>
  )
}
