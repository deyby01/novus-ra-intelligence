import type { WidgetSize } from './types'

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
