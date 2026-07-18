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
import type { CreateWidgetInput } from '../api'
import { useWidgetMutations } from '../hooks'
import type { AggregationFunction, ChartType, WidgetSize } from '../types'

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

const SIZE_OPTIONS: { value: WidgetSize; label: string }[] = [
  { value: 'small', label: 'Pequeño (1/3)' },
  { value: 'medium', label: 'Mediano (1/2)' },
  { value: 'large', label: 'Grande (ancho completo)' },
]

interface Props {
  dashboardId: string
  isOpen: boolean
  onClose: () => void
}

export function AddWidgetModal({ dashboardId, isOpen, onClose }: Props) {
  const { data: datasets } = useDatasets()
  const { create } = useWidgetMutations(dashboardId)

  const [title, setTitle] = useState('')
  const [datasetId, setDatasetId] = useState<string>('')
  const [chartType, setChartType] = useState<ChartType | ''>('')
  const [agg, setAgg] = useState<AggregationFunction | ''>('')
  const [metric, setMetric] = useState<string>('none')
  const [groupBy, setGroupBy] = useState<string>('none')
  const [size, setSize] = useState<WidgetSize>('small')

  // Fetch fields only if a dataset is selected
  const { data: fields } = useDatasetFields(datasetId)

  const numericFields = fields?.filter((f) => f.field_type === 'number') || []

  // Validation
  const requiresMetric = agg !== 'count' && agg !== ''
  const isMetricValid = !requiresMetric || metric !== 'none'
  const isFormValid =
    datasetId !== '' && chartType !== '' && agg !== '' && isMetricValid

  const resetForm = () => {
    setTitle('')
    setDatasetId('')
    setChartType('')
    setAgg('')
    setMetric('none')
    setGroupBy('none')
    setSize('small')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    const input: CreateWidgetInput = {
      dashboard: dashboardId,
      dataset: datasetId,
      chart_type: chartType as ChartType,
      config: {
        agg: agg as AggregationFunction,
        ...(metric !== 'none' && { metric }),
        ...(groupBy !== 'none' && { group_by: groupBy }),
        ...(title.trim() && { title: title.trim() }),
        size,
      },
      position: {},
    }

    create.mutate(input, {
      onSuccess: () => {
        resetForm()
        onClose()
      },
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display">Añadir widget</DialogTitle>
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
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="size">Tamaño inicial</Label>
                    <Select
                      value={size}
                      onValueChange={(val) => setSize(val as WidgetSize)}
                    >
                      <SelectTrigger id="size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SIZE_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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

            {create.isError && (
              <p className="text-[12.5px] text-red-600">
                No pudimos crear el widget. Revisa la configuración.
              </p>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              disabled={create.isPending}
              className="text-g600 hover:bg-g100 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid || create.isPending}
              className="bg-g900 font-display hover:bg-g800 inline-flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors disabled:opacity-60"
            >
              {create.isPending && (
                <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
              )}
              Añadir widget
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
