import { DATA } from '../chart-colors'

interface SparklineProps {
  /** The series to plot, in order. Fewer than two points renders nothing. */
  values: number[]
  stroke?: string
  className?: string
}

/**
 * A minimal, axis-less trend line for a KPI. Normalizes the series into a fixed
 * viewBox and stretches to fill its container; the stroke stays crisp via
 * `vectorEffect` despite the non-uniform scaling.
 */
export function Sparkline({
  values,
  stroke = DATA.blue,
  className,
}: SparklineProps) {
  if (values.length < 2) return null

  const width = 100
  const height = 24
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - 1 - ((value - min) / span) * (height - 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
