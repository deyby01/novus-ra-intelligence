import { MoreVertical, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * The per-widget "⋯" menu. Only "Eliminar" is wired today; editing a widget,
 * duplicating it, or changing its chart type belong to the widget config panel,
 * a separate flow that isn't built yet — so they're intentionally absent rather
 * than shown disabled.
 */
export function WidgetMenu({
  onDelete,
  disabled,
}: {
  onDelete: () => void
  disabled?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Acciones del widget"
          disabled={disabled}
          className="text-g400 hover:bg-g100 hover:text-g600 grid size-7 shrink-0 place-items-center rounded-lg transition-colors disabled:opacity-50"
        >
          <MoreVertical className="size-[15px]" strokeWidth={1.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 className="mr-2 size-4" strokeWidth={1.5} />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
