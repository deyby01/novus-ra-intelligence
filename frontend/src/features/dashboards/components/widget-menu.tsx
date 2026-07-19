import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * The per-widget "⋯" menu: edit the widget's configuration or delete it.
 * Resizing and reordering are direct gestures on the card, not menu items.
 */
export function WidgetMenu({
  onEdit,
  onDelete,
  disabled,
}: {
  onEdit: () => void
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
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="mr-2 size-4" strokeWidth={1.5} />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 className="mr-2 size-4" strokeWidth={1.5} />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
