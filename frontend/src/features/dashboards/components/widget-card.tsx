import { AlertCircle, Loader2, MoreVertical, Trash2 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import type { AggregationResult, Widget } from '../types'

const COLORS = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#9333ea',
  '#0891b2',
]

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

  // Format the title based on the config
  const title = `${widget.config.agg.toUpperCase()}${
    widget.config.metric ? ` of ${widget.config.metric}` : ''
  }${widget.config.group_by ? ` by ${widget.config.group_by}` : ''}`

  return (
    <div className="flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between p-6 pb-2">
        <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
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

      <div className="flex flex-1 items-center justify-center p-6 pt-0">
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
          <div className="h-[250px] w-full">
            <ChartRenderer type={widget.chart_type} data={data} />
          </div>
        )}
      </div>
    </div>
  )
}

function ChartRenderer({
  type,
  data,
}: {
  type: Widget['chart_type']
  data: AggregationResult
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
      <div className="flex h-full items-center justify-center">
        <div className="text-5xl font-bold tracking-tighter">
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
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
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
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
          />
          <YAxis fontSize={12} tickLine={false} axisLine={false} />
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
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
          />
          <YAxis fontSize={12} tickLine={false} axisLine={false} />
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
