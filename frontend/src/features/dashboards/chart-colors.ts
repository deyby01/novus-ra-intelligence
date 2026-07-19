/**
 * The Grafito DATA palette — flat, vivid office colors used ONLY for chart marks
 * (series, KPI trends, +/- states). The UI chrome stays grey; color is reserved
 * for the data itself. No shadows or gradients: fills are solid.
 */
export const DATA = {
  blue: '#2563eb', // primary / emphasis series
  blue2: '#60a5fa',
  blue3: '#93c5fd',
  blue4: '#bfdbfe',
  areaFill: '#e8f0fe', // solid fill under the line
  red: '#dc2626',
  green: '#16a34a',
  amber: '#f59e0b',
  posText: '#15803d',
  posBg: '#e3f5e9',
  negText: '#dc2626',
  negBg: '#fdeaea',
} as const

/**
 * Categorical series order (donut, multi-category): d1 → d2 → d3 → d4 first,
 * then distinct fallback hues so a chart with more groups never collides.
 */
export const CATEGORICAL = [
  DATA.blue,
  DATA.red,
  DATA.green,
  DATA.amber,
  '#9333ea',
  '#0891b2',
]

/** A single-measure ranking ramp — emphasis fades from strong to faint by rank. */
export const BLUE_RAMP = [DATA.blue, DATA.blue2, DATA.blue3, DATA.blue4]

/** Chart chrome stays grey: axes, gridlines, and labels are never colored. */
export const CHART_GREY = {
  grid: '#ececee', // --g150
  axisLabel: '#a1a1aa', // --g400
} as const
