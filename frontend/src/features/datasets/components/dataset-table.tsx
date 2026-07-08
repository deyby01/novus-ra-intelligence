import type { ReactNode } from 'react'
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
}

/** A read-only table: columns come from the dataset's fields, cells from row data. */
export function DatasetTable({ fields, rows }: DatasetTableProps) {
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
