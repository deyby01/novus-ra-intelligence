import { LayoutGrid } from 'lucide-react'
import type { ChartType } from '../types'

/**
 * A monochrome, abstract thumbnail of one widget — keyed only by its chart
 * type. It never invents values; it shows the *kind* of chart, so the preview
 * only ever depicts widgets the product can actually build (kpi/bar/pie/line/
 * table).
 */
function Glyph({ type }: { type: ChartType }) {
  if (type === 'kpi') {
    return (
      <div className="flex h-full flex-col justify-center gap-1.5">
        <span className="bg-g300 h-1 w-2/5 rounded-full" />
        <span className="bg-g900 h-2.5 w-3/4 rounded-[3px]" />
      </div>
    )
  }

  if (type === 'bar') {
    const bars = [40, 62, 50, 100, 74]
    const peak = Math.max(...bars)
    return (
      <div className="flex h-full items-end gap-[3px]">
        {bars.map((height, i) => (
          <span
            key={i}
            className={`flex-1 rounded-t-[2px] ${
              height === peak
                ? 'bg-g900'
                : i === bars.length - 1
                  ? 'bg-g600'
                  : 'bg-g300'
            }`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    )
  }

  if (type === 'pie') {
    return (
      <div className="flex h-full items-center gap-2">
        <span
          className="size-[34px] shrink-0 rounded-full"
          style={{
            background:
              'conic-gradient(var(--color-g900) 0 62%, var(--color-g300) 62% 100%)',
          }}
        >
          <span className="bg-g0 m-[9px] block size-4 rounded-full" />
        </span>
        <span className="flex grow flex-col gap-1.5">
          <span className="bg-g200 h-1 w-full rounded-full" />
          <span className="bg-g200 h-1 w-2/3 rounded-full" />
        </span>
      </div>
    )
  }

  if (type === 'line') {
    return (
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <polyline
          points="0,32 20,22 40,26 60,12 80,18 100,4"
          fill="none"
          stroke="var(--color-g900)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    )
  }

  // table
  return (
    <div className="flex h-full flex-col justify-center gap-1.5">
      <span className="bg-g300 h-1.5 w-full rounded-[3px]" />
      <span className="bg-g200 h-1.5 w-full rounded-[3px]" />
      <span className="bg-g200 h-1.5 w-4/5 rounded-[3px]" />
    </div>
  )
}

function MiniWidget({ type }: { type: ChartType }) {
  return (
    <div className="border-g200 overflow-hidden rounded-[9px] border bg-white p-2">
      <Glyph type={type} />
    </div>
  )
}

/** The card's 150px preview: a 2×2 mini-maquette of the dashboard's widgets. */
export function DashboardPreview({
  widgetTypes,
}: {
  widgetTypes: ChartType[]
}) {
  const shown = widgetTypes.slice(0, 4)
  const emptySlots = Math.max(0, 4 - shown.length)

  if (shown.length === 0) {
    return (
      <div className="bg-g50 border-g150 flex h-[150px] flex-col items-center justify-center gap-1.5 border-b">
        <LayoutGrid className="text-g300 size-6" strokeWidth={1.5} />
        <span className="text-g400 text-[11.5px]">Sin widgets todavía</span>
      </div>
    )
  }

  return (
    <div className="bg-g50 border-g150 grid h-[150px] grid-cols-2 grid-rows-2 gap-[9px] border-b p-4">
      {shown.map((type, i) => (
        <MiniWidget key={i} type={type} />
      ))}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="border-g200 rounded-[9px] border border-dashed"
        />
      ))}
    </div>
  )
}
