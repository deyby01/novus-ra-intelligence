import { AlertCircle, Loader2, MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDatasetAggregation, useWidgetMutations } from '../hooks'
import type { Widget } from '../types'
import { ChartRenderer, chartHeight } from './chart-renderer'

export function WidgetCard({ widget }: { widget: Widget }) {
  const { data, isPending, isError } = useDatasetAggregation({
    datasetId: widget.dataset,
    agg: widget.config.agg,
    metric: widget.config.metric,
    group_by: widget.config.group_by,
  })

  const { remove } = useWidgetMutations(widget.dashboard)

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this widget?')) {
      remove.mutate(widget.id)
    }
  }

  // Use custom title if provided, otherwise generate one
  const title =
    widget.config.title ||
    `${widget.config.agg.toUpperCase()}${
      widget.config.metric ? ` of ${widget.config.metric}` : ''
    }${widget.config.group_by ? ` by ${widget.config.group_by}` : ''}`

  const height = chartHeight(widget.config.size)

  return (
    <div className="flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
        <h3 className="truncate pr-2 text-sm font-semibold leading-none tracking-tight sm:text-base">
          {title}
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 shrink-0 p-0"
              disabled={remove.isPending}
            >
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete widget
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 pt-0 sm:p-6 sm:pt-0">
        {isPending && (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        )}
        {!isPending && isError && (
          <div className="flex flex-col items-center gap-2 text-destructive">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">Failed to load data</p>
          </div>
        )}
        {!isPending && !isError && data && (
          <div className="w-full" style={{ height }}>
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
