import type { Widget, WidgetSize } from './types'

/** Map a widget size to Tailwind col-span classes for a 6-column grid. */
export function sizeToColSpan(size?: WidgetSize): string {
  switch (size) {
    case 'large':
      return 'col-span-6'
    case 'medium':
      return 'col-span-6 sm:col-span-3'
    default:
      return 'col-span-6 sm:col-span-3 lg:col-span-2'
  }
}

/** A widget's display title: its own, or one derived from its aggregation. */
export function widgetTitle(widget: Widget): string {
  const { config } = widget
  if (config.title) return config.title
  // config is a free-form JSONField; a partially-configured widget may lack agg.
  if (!config.agg) return 'Widget'
  const metric = config.metric ? ` de ${config.metric}` : ''
  const group = config.group_by ? ` por ${config.group_by}` : ''
  return `${config.agg.toUpperCase()}${metric}${group}`
}

/** Short Spanish relative time: "hace un momento", "hace 2 h", "hace 3 d". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

/** The resizable widget grid: 6 columns, fixed row unit, gap (all in px). */
export const GRID_COLUMNS = 6
export const GRID_ROW_PX = 30
export const GRID_GAP_PX = 14
/** Height clamp, in row units, so a widget can't collapse or grow unbounded. */
export const MIN_ROWS = 3
export const MAX_ROWS = 20

export interface WidgetSpan {
  w: number
  h: number
}

export function clampSpan(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

/** A widget's default span when it has never been resized (from its size). */
function defaultSpan(widget: Widget): WidgetSpan {
  if (widget.chart_type === 'kpi') return { w: 2, h: 4 }
  switch (widget.config.size) {
    case 'large':
      return { w: 6, h: 9 }
    case 'medium':
      return { w: 3, h: 8 }
    default:
      return { w: 2, h: 6 }
  }
}

/**
 * A widget's grid span: its persisted `position` when it's been resized, else a
 * sensible default derived from its size. Column width is capped to the grid.
 */
export function widgetSpan(widget: Widget): WidgetSpan {
  const position = widget.position
  if (
    position &&
    typeof position.w === 'number' &&
    typeof position.h === 'number'
  ) {
    return {
      w: clampSpan(position.w, 1, GRID_COLUMNS),
      h: clampSpan(position.h, MIN_ROWS, MAX_ROWS),
    }
  }
  return defaultSpan(widget)
}
