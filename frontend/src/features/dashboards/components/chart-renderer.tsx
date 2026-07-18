import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BLUE_RAMP, CATEGORICAL, CHART_GREY, DATA } from '../chart-colors'
import type { AggregationResult, Widget, WidgetSize } from '../types'

/** Chart height varies by widget size. */
export function chartHeight(size?: WidgetSize): number {
  switch (size) {
    case 'large':
      return 350
    case 'medium':
      return 300
    default:
      return 250
  }
}

const tooltipStyle = {
  borderRadius: '10px',
  border: '1px solid #e4e4e7',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  fontSize: '12px',
}

const axisTick = { fill: CHART_GREY.axisLabel, fontSize: 12 }

/** Render an aggregation result as the requested chart type. */
export function ChartRenderer({
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
      <div className="text-g400 flex h-full items-center justify-center text-sm">
        Sin datos
      </div>
    )
  }

  if (type === 'kpi') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1">
        <div className="font-display text-g900 text-4xl font-semibold tracking-tight sm:text-5xl">
          {chartData[0]?.value?.toLocaleString() ?? '-'}
        </div>
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className="h-full w-full overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-g150 border-b">
              <th className="text-g400 px-2 py-2 text-left text-[10px] font-semibold tracking-[0.05em] uppercase">
                {data.group_by || 'Grupo'}
              </th>
              <th className="text-g400 px-2 py-2 text-right text-[10px] font-semibold tracking-[0.05em] uppercase">
                Valor
              </th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={i} className="border-g150 border-b last:border-0">
                <td className="text-g700 px-2 py-2.5 font-medium">
                  {row.name}
                </td>
                <td className="font-display text-g900 px-2 py-2.5 text-right font-semibold">
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
            contentStyle={tooltipStyle}
            itemStyle={{ color: '#18181b' }}
          />
          <Legend
            layout={size === 'small' ? 'horizontal' : 'vertical'}
            verticalAlign={size === 'small' ? 'bottom' : 'middle'}
            align={size === 'small' ? 'center' : 'right'}
            wrapperStyle={{ fontSize: '12px', color: '#52525b' }}
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
                fill={CATEGORICAL[index % CATEGORICAL.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'bar') {
    // Emphasis by rank: the tallest bar takes the strongest blue, the rest fade.
    const rankByIndex = new Map<number, number>()
    chartData
      .map((d, i) => ({ i, v: d.value }))
      .sort((a, b) => b.v - a.v)
      .forEach((entry, rank) => rankByIndex.set(entry.i, rank))
    const barColor = (index: number) =>
      BLUE_RAMP[Math.min(rankByIndex.get(index) ?? 0, BLUE_RAMP.length - 1)]

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: bottomMargin }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={CHART_GREY.grid}
          />
          <XAxis
            dataKey="name"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            angle={needsRotation ? -35 : 0}
            textAnchor={needsRotation ? 'end' : 'middle'}
            minTickGap={15}
            interval="preserveStartEnd"
          />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={50} />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((_, index) => (
              <Cell key={`bar-${index}`} fill={barColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: bottomMargin }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={CHART_GREY.grid}
          />
          <XAxis
            dataKey="name"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            angle={needsRotation ? -35 : 0}
            textAnchor={needsRotation ? 'end' : 'middle'}
            minTickGap={15}
            interval="preserveStartEnd"
          />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={50} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={DATA.blue}
            strokeWidth={2.5}
            fill={DATA.areaFill}
            fillOpacity={1}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return <div className="text-g400 text-sm">Tipo de gráfico no soportado</div>
}
