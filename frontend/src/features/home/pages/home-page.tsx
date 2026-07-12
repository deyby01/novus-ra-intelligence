import { FileSpreadsheet, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DatasetCard } from '@/features/datasets/components/dataset-card'
import { useDatasets } from '@/features/datasets/hooks'

export function HomePage() {
  const { data: datasets, isPending, isError } = useDatasets()

  const recentDatasets = datasets?.slice(0, 6) ?? []

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* ── First-run empty state (No datasets) ── */}
      {!isPending && !isError && datasets?.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <div className="bg-muted grid size-12 place-items-center rounded-xl border">
            <FileSpreadsheet className="text-muted-foreground size-6" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">
            Welcome to Novus RA Intelligence
          </h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            Import an Excel file to turn it into a live dataset you can filter,
            chart, and instantly generate AI reports on.
          </p>
          <Button asChild className="mt-2" data-tour="import">
            <Link to="/datasets/import">
              <Upload className="mr-2 size-4" />
              Import your first spreadsheet
            </Link>
          </Button>

          {/* Slot for Slice 5 sample dataset button */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <p className="text-muted-foreground text-xs">More ways to start:</p>
            {/* TODO: Try a sample dataset button goes here */}
          </div>
        </div>
      )}

      {/* ── Loading state ── */}
      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="bg-muted h-28 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {/* ── Error state ── */}
      {isError && (
        <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          We couldn&apos;t load your datasets. Please try again.
        </p>
      )}

      {/* ── Home with recent datasets ── */}
      {datasets && datasets.length > 0 && (
        <>
          <header className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Welcome back
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Pick up where you left off or bring in new data.
              </p>
            </div>
            <Button asChild data-tour="import">
              <Link to="/datasets/import">
                <Upload className="mr-2 size-4" />
                Import spreadsheet
              </Link>
            </Button>
          </header>

          <section>
            <h2 className="mb-4 text-lg font-semibold tracking-tight">
              Recent datasets
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentDatasets.map((dataset) => (
                <DatasetCard key={dataset.id} dataset={dataset} />
              ))}
            </div>
          </section>

          {/* Slot for Slice 5 sample dataset section when there are existing datasets */}
          {/* TODO: Add try sample affordance here if desired */}
        </>
      )}
    </div>
  )
}
