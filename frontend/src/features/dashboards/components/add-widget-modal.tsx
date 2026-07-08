import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { useDatasets, useDatasetFields } from '@/features/datasets/hooks'
import { useWidgetMutations } from '../hooks'
import type { CreateWidgetInput } from '../api'
import type { AggregationFunction, ChartType, WidgetSize } from '../types'

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'kpi', label: 'KPI (Single Value)' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'table', label: 'Table' },
]

const AGG_FUNCTIONS: { value: AggregationFunction; label: string }[] = [
  { value: 'count', label: 'Count (Rows)' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
]

const SIZE_OPTIONS: { value: WidgetSize; label: string }[] = [
  { value: 'small', label: 'Small (1/3 width)' },
  { value: 'medium', label: 'Medium (1/2 width)' },
  { value: 'large', label: 'Large (Full width)' },
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
            <DialogTitle>Add Widget</DialogTitle>
            <DialogDescription>
              Configure a new chart or metric to add to your dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title (Optional)</Label>
              <Input
                id="title"
                placeholder="e.g. Total Sales, Revenue by Region…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dataset">Dataset</Label>
              <Select value={datasetId} onValueChange={setDatasetId}>
                <SelectTrigger id="dataset">
                  <SelectValue placeholder="Select a dataset" />
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
                    <Label htmlFor="chartType">Chart Type</Label>
                    <Select
                      value={chartType}
                      onValueChange={(val) => setChartType(val as ChartType)}
                    >
                      <SelectTrigger id="chartType">
                        <SelectValue placeholder="Select type" />
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
                    <Label htmlFor="size">Widget Size</Label>
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
                  <Label htmlFor="agg">Aggregation</Label>
                  <Select
                    value={agg}
                    onValueChange={(val) => setAgg(val as AggregationFunction)}
                  >
                    <SelectTrigger id="agg">
                      <SelectValue placeholder="Select an aggregation" />
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
                    <Label htmlFor="metric">Metric (Numeric Field)</Label>
                    <Select value={metric} onValueChange={setMetric}>
                      <SelectTrigger id="metric">
                        <SelectValue placeholder="Select a numeric field" />
                      </SelectTrigger>
                      <SelectContent>
                        {numericFields.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No numeric fields available
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
                  <Label htmlFor="groupBy">Group By (Optional)</Label>
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger id="groupBy">
                      <SelectValue placeholder="No grouping" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
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
              <p className="text-sm text-destructive">
                Failed to create widget. Please check the configuration.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid || create.isPending}>
              Add Widget
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
