import { ArrowLeft, Plus, Table2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DatasetTable } from '../components/dataset-table'
import { RowEditor } from '../components/row-editor'
import {
  useDataset,
  useDatasetFields,
  useDatasetRows,
  useRowMutations,
} from '../hooks'
import type { DatasetRow, RowData } from '../types'

type Editing = { mode: 'create' } | { mode: 'edit'; row: DatasetRow } | null

export function DatasetDetailPage() {
  const { datasetId = '' } = useParams<{ datasetId: string }>()
  const dataset = useDataset(datasetId)
  const fields = useDatasetFields(datasetId)
  const rows = useDatasetRows(datasetId)
  const { create, update, remove } = useRowMutations(datasetId)

  const [editing, setEditing] = useState<Editing>(null)

  const isPending = dataset.isPending || fields.isPending || rows.isPending
  const isError = dataset.isError || fields.isError || rows.isError

  const closeEditor = () => {
    setEditing(null)
    create.reset()
    update.reset()
  }

  const handleSubmit = (values: RowData) => {
    if (editing?.mode === 'create') {
      create.mutate(values, { onSuccess: closeEditor })
    } else if (editing?.mode === 'edit') {
      // PATCH replaces the whole data document, so merge over the row's
      // existing data to preserve any keys that have no matching field.
      update.mutate(
        { id: editing.row.id, values: { ...editing.row.data, ...values } },
        { onSuccess: closeEditor },
      )
    }
  }

  const isSaving =
    editing?.mode === 'edit' ? update.isPending : create.isPending
  const saveError = editing?.mode === 'edit' ? update.isError : create.isError

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Datasets
      </Link>

      {isPending && (
        <div className="space-y-4">
          <div className="bg-muted h-8 w-56 animate-pulse rounded-lg" />
          <div className="bg-muted h-64 animate-pulse rounded-xl" />
        </div>
      )}

      {!isPending && isError && (
        <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          We couldn&apos;t load this dataset. Please try again.
        </p>
      )}

      {!isPending && !isError && dataset.data && fields.data && rows.data && (
        <>
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {dataset.data.name}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {rows.data.count} {rows.data.count === 1 ? 'row' : 'rows'}
                {fields.data.length > 0 &&
                  ` · ${fields.data.length} ${fields.data.length === 1 ? 'column' : 'columns'}`}
              </p>
            </div>
            {fields.data.length > 0 && (
              <Button
                onClick={() => setEditing({ mode: 'create' })}
                disabled={Boolean(editing)}
              >
                <Plus />
                Add row
              </Button>
            )}
          </header>

          {fields.data.length === 0 ? (
            <EmptyState detail="This dataset has no columns yet. Import a spreadsheet to give it structure." />
          ) : (
            <>
              {editing && (
                <RowEditor
                  key={editing.mode === 'edit' ? editing.row.id : 'create'}
                  fields={fields.data}
                  title={editing.mode === 'create' ? 'Add row' : 'Edit row'}
                  initialData={
                    editing.mode === 'edit' ? editing.row.data : undefined
                  }
                  isSaving={isSaving}
                  error={saveError}
                  onSubmit={handleSubmit}
                  onCancel={closeEditor}
                />
              )}

              {rows.data.count === 0 ? (
                !editing && (
                  <EmptyState detail="This dataset has columns but no rows yet.">
                    <Button
                      className="mt-2"
                      onClick={() => setEditing({ mode: 'create' })}
                    >
                      <Plus />
                      Add the first row
                    </Button>
                  </EmptyState>
                )
              ) : (
                <>
                  <DatasetTable
                    fields={fields.data}
                    rows={rows.data.results}
                    onEdit={(row) => setEditing({ mode: 'edit', row })}
                    onDelete={(row) => remove.mutate(row.id)}
                    deletingId={
                      remove.isPending ? (remove.variables ?? null) : null
                    }
                  />
                  {remove.isError && (
                    <p className="text-destructive mt-3 text-sm">
                      We couldn&apos;t delete the row. Please try again.
                    </p>
                  )}
                  {rows.data.count > rows.data.results.length && (
                    <p className="text-muted-foreground mt-3 text-center text-xs">
                      Showing the first {rows.data.results.length} of{' '}
                      {rows.data.count} rows.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({
  detail,
  children,
}: {
  detail: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <div className="bg-muted grid size-12 place-items-center rounded-xl border">
        <Table2 className="text-muted-foreground size-6" />
      </div>
      <p className="text-muted-foreground max-w-sm text-sm">{detail}</p>
      {children}
    </div>
  )
}
