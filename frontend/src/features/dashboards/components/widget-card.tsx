import { AlertCircle, Loader2, MoreVertical, Trash2 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDatasetAggregation, useWidgetMutations } from '../hooks'
import type { AggregationResult, Widget, WidgetSize } from '../types'

const COLORS = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#9333ea',
  '#0891b2',
  '#e11d48',
  '#65a30d',
]

/** Chart height varies by widget size. */
function chartHeight(size?: WidgetSize): number {
  switch (size) {
    case 'large':
      return 350
    case 'medium':
      return 300
    default:
      return 250
  }
}

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

function ChartRenderer({
  type,
  data,
  size,
}: {
  type: Widget['chart_type']
  data: AggregationResult
  size?: WidgetSize
}) {
  const chartData = data.results.map((r) => ({
    name: r.group === null ? 'All' : String(r.group),
    value: r.value ?? 0,
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    )
  }

  if (type === 'kpi') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1">
        <div className="text-4xl font-bold tracking-tighter sm:text-5xl">
          {chartData[0]?.value?.toLocaleString() ?? '-'}
        </div>
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className="h-full w-full overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left font-medium">
                {data.group_by || 'Group'}
              </th>
              <th className="p-2 text-right font-medium text-muted-foreground">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-2">{row.name}</td>
                <td className="p-2 text-right font-medium">
                  {row.value.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Calculate bottom margin based on label length for rotated labels
  const maxLabelLen = Math.max(...chartData.map((d) => d.name.length))
  const needsRotation = chartData.length > 3 || maxLabelLen > 8
  const bottomMargin = needsRotation ? 60 : 20

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            itemStyle={{ color: '#000' }}
          />
          <Legend
            layout={size === 'small' ? 'horizontal' : 'vertical'}
            verticalAlign={size === 'small' ? 'bottom' : 'middle'}
            align={size === 'small' ? 'center' : 'right'}
            wrapperStyle={{ fontSize: '12px' }}
          />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: bottomMargin }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e5e7eb"
          />
          <XAxis
            dataKey="name"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            angle={needsRotation ? -35 : 0}
            textAnchor={needsRotation ? 'end' : 'middle'}
            interval={0}
          />
          <YAxis fontSize={12} tickLine={false} axisLine={false} width={50} />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: bottomMargin }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e5e7eb"
          />
          <XAxis
            dataKey="name"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            angle={needsRotation ? -35 : 0}
            textAnchor={needsRotation ? 'end' : 'middle'}
            interval={0}
          />
          <YAxis fontSize={12} tickLine={false} axisLine={false} width={50} />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="text-sm text-muted-foreground">Unsupported chart type</div>
  )
}
