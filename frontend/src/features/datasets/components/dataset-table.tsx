import { Pencil, Trash2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { DatasetField, DatasetRow } from '../types'

/** Render a JSON cell value the way a spreadsheet cell would read. */
function formatCell(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground/40">—</span>
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  return String(value)
}

interface DatasetTableProps {
  fields: DatasetField[]
  rows: DatasetRow[]
  onEdit?: (row: DatasetRow) => void
  onDelete?: (row: DatasetRow) => void
  deletingId?: string | null
}

/** A table whose columns come from the dataset's fields and cells from row data.
 *
 * When ``onEdit``/``onDelete`` are provided it grows an actions column; delete
 * asks for a single inline confirmation before firing.
 */
export function DatasetTable({
  fields,
  rows,
  onEdit,
  onDelete,
  deletingId,
}: DatasetTableProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const hasActions = Boolean(onEdit || onDelete)

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/40 border-b text-left">
            {fields.map((field) => (
              <th
                key={field.id}
                scope="col"
                className="text-muted-foreground px-4 py-2.5 font-medium whitespace-nowrap"
              >
                {field.label}
              </th>
            ))}
            {hasActions && (
              <th scope="col" className="w-0 px-4 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-muted/30 border-b transition-colors last:border-0"
            >
              {fields.map((field) => (
                <td key={field.id} className="px-4 py-2.5 whitespace-nowrap">
                  {formatCell(row.data[field.key])}
                </td>
              ))}
              {hasActions && (
                <td className="px-4 py-2 whitespace-nowrap">
                  {confirmingId === row.id ? (
                    <span className="flex items-center justify-end gap-2">
                      <span className="text-muted-foreground text-xs">
                        Delete?
                      </span>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingId === row.id}
                        onClick={() => onDelete?.(row)}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={deletingId === row.id}
                        onClick={() => setConfirmingId(null)}
                      >
                        Cancel
                      </Button>
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit row"
                          onClick={() => onEdit(row)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete row"
                          onClick={() => setConfirmingId(row.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
