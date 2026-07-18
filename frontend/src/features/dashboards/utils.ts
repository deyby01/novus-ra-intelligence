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
