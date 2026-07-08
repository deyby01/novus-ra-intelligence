import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { DatasetField, FieldType, RowData } from '../types'

/** The HTML input type that best fits a field's declared type. */
function inputType(fieldType: FieldType): string {
  if (fieldType === 'number') return 'number'
  if (fieldType === 'date') return 'date'
  return 'text'
}

/** Turn a stored JSON value into the string/boolean an input control expects. */
function toInputValue(field: DatasetField, value: unknown): string | boolean {
  if (field.field_type === 'boolean') return value === true
  if (value === null || value === undefined) return ''
  return String(value)
}

/** Coerce the form's control values back into a typed JSON document. */
function toRowData(
  fields: DatasetField[],
  values: Record<string, string | boolean>,
): RowData {
  const data: RowData = {}
  for (const field of fields) {
    const value = values[field.key]
    if (field.field_type === 'boolean') {
      data[field.key] = value === true
    } else if (field.field_type === 'number') {
      data[field.key] = value === '' ? null : Number(value)
    } else {
      data[field.key] = value
    }
  }
  return data
}

interface RowEditorProps {
  fields: DatasetField[]
  title: string
  initialData?: RowData
  isSaving: boolean
  error?: boolean
  onSubmit: (values: RowData) => void
  onCancel: () => void
}

/** A form panel to add or edit one row: one control per field, typed by field. */
export function RowEditor({
  fields,
  title,
  initialData,
  isSaving,
  error,
  onSubmit,
  onCancel,
}: RowEditorProps) {
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const initial: Record<string, string | boolean> = {}
    for (const field of fields) {
      initial[field.key] = toInputValue(field, initialData?.[field.key])
    }
    return initial
  })

  const setValue = (key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(toRowData(fields, values))
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl border p-5">
      <h2 className="mb-4 font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            {field.field_type === 'boolean' ? (
              <label className="flex items-center gap-2 pt-6 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={values[field.key] === true}
                  onChange={(event) =>
                    setValue(field.key, event.target.checked)
                  }
                  className="border-input size-4 rounded border"
                />
                {field.label}
              </label>
            ) : (
              <>
                <Label htmlFor={`row-field-${field.id}`}>{field.label}</Label>
                <Input
                  id={`row-field-${field.id}`}
                  type={inputType(field.field_type)}
                  value={values[field.key] as string}
                  onChange={(event) => setValue(field.key, event.target.value)}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-destructive mt-4 text-sm">
          We couldn&apos;t save the row. Please try again.
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save row'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
