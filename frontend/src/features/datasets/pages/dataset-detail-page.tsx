import { ArrowLeft, Table2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { DatasetTable } from '../components/dataset-table'
import { useDataset, useDatasetFields, useDatasetRows } from '../hooks'

export function DatasetDetailPage() {
  const { datasetId = '' } = useParams<{ datasetId: string }>()
  const dataset = useDataset(datasetId)
  const fields = useDatasetFields(datasetId)
  const rows = useDatasetRows(datasetId)

  const isPending = dataset.isPending || fields.isPending || rows.isPending
  const isError = dataset.isError || fields.isError || rows.isError

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
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              {dataset.data.name}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {rows.data.count} {rows.data.count === 1 ? 'row' : 'rows'}
              {fields.data.length > 0 &&
                ` · ${fields.data.length} ${fields.data.length === 1 ? 'column' : 'columns'}`}
            </p>
          </header>

          {fields.data.length === 0 ? (
            <EmptyState detail="This dataset has no columns yet. Import a spreadsheet to give it structure." />
          ) : rows.data.count === 0 ? (
            <EmptyState detail="This dataset has columns but no rows yet." />
          ) : (
            <>
              <DatasetTable fields={fields.data} rows={rows.data.results} />
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
    </div>
  )
}

function EmptyState({ detail }: { detail: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <div className="bg-muted grid size-12 place-items-center rounded-xl border">
        <Table2 className="text-muted-foreground size-6" />
      </div>
      <p className="text-muted-foreground max-w-sm text-sm">{detail}</p>
    </div>
  )
}
