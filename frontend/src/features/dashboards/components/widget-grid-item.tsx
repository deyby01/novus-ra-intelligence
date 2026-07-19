import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react'
import { useRef, useState } from 'react'
import type { Widget } from '../types'
import {
  clampSpan,
  GRID_COLUMNS,
  GRID_GAP_PX,
  GRID_ROW_PX,
  MAX_ROWS,
  MIN_ROWS,
  type WidgetSpan,
  widgetSpan,
} from '../utils'
import { WidgetCard } from './widget-card'

interface WidgetGridItemProps {
  widget: Widget
  editing: boolean
  gridRef: RefObject<HTMLDivElement | null>
  onResize: (widget: Widget, span: WidgetSpan) => void
  onEditWidget: (widget: Widget) => void
}

/**
 * A widget in the resizable grid. The bottom-right handle drag-resizes the
 * widget's span at any time (shown on hover); in edit mode a top-left grip
 * makes the card draggable to reorder (dnd-kit). The two never conflict — the
 * resize handle owns its own pointer sequence, the grip owns the drag.
 */
export function WidgetGridItem({
  widget,
  editing,
  gridRef,
  onResize,
  onEditWidget,
}: WidgetGridItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !editing })

  const [draft, setDraft] = useState<WidgetSpan | null>(null)
  const latest = useRef<WidgetSpan | null>(null)
  const span = draft ?? widgetSpan(widget)

  const startResize = (event: ReactPointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const base = widgetSpan(widget)
    const startX = event.clientX
    const startY = event.clientY
    const gridWidth = gridRef.current?.clientWidth ?? 0
    const colStep =
      (gridWidth - GRID_GAP_PX * (GRID_COLUMNS - 1)) / GRID_COLUMNS +
      GRID_GAP_PX
    const rowStep = GRID_ROW_PX + GRID_GAP_PX

    const move = (e: PointerEvent) => {
      const dCols = colStep > 0 ? Math.round((e.clientX - startX) / colStep) : 0
      const dRows = Math.round((e.clientY - startY) / rowStep)
      const next: WidgetSpan = {
        w: clampSpan(base.w + dCols, 1, GRID_COLUMNS),
        h: clampSpan(base.h + dRows, MIN_ROWS, MAX_ROWS),
      }
      latest.current = next
      setDraft(next)
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      if (latest.current) onResize(widget, latest.current)
      latest.current = null
      setDraft(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
  }

  const style: CSSProperties = {
    gridColumn: `span ${span.w}`,
    gridRow: `span ${span.h}`,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative h-full ${
        editing ? 'ring-g300 rounded-2xl ring-2 ring-offset-2' : ''
      }`}
    >
      <WidgetCard widget={widget} onEdit={() => onEditWidget(widget)} />

      {editing && (
        <button
          type="button"
          aria-label="Mover widget"
          {...attributes}
          {...listeners}
          className="border-g200 text-g500 hover:text-g900 absolute top-1 left-1 grid size-6 cursor-grab touch-none place-items-center rounded-md border bg-white/90 backdrop-blur active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" strokeWidth={1.5} />
        </button>
      )}

      <button
        type="button"
        aria-label="Redimensionar widget"
        onPointerDown={startResize}
        className="border-g200 text-g500 hover:text-g900 absolute right-1 bottom-1 grid size-6 cursor-se-resize touch-none place-items-center rounded-md border bg-white/90 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M11 5 5 11M11 9l-2 2" />
        </svg>
      </button>
    </div>
  )
}
