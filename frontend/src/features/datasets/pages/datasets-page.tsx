import { FileSpreadsheet, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DatasetCard } from '../components/dataset-card'
import { useDatasets } from '../hooks'

export function DatasetsPage() {
  const { data: datasets, isPending, isError } = useDatasets()

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Datasets</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            The imported and manual datasets in this workspace.
          </p>
        </div>
        <Button asChild>
          <Link to="/datasets/import">
            <Upload />
            Import spreadsheet
          </Link>
        </Button>
      </header>

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="bg-muted h-28 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          We couldn&apos;t load your datasets. Please try again.
        </p>
      )}

      {datasets?.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <div className="bg-muted grid size-12 place-items-center rounded-xl border">
            <FileSpreadsheet className="text-muted-foreground size-6" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">
            No datasets yet
          </h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            Import an Excel file to turn it into a live dataset you can filter,
            chart, and report on.
          </p>
          <Button asChild className="mt-2">
            <Link to="/datasets/import">
              <Upload />
              Import a spreadsheet
            </Link>
          </Button>
        </div>
      )}

      {datasets && datasets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {datasets.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} />
          ))}
        </div>
      )}
    </div>
  )
}
