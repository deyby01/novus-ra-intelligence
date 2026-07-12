import { FileSpreadsheet, Loader2, PlayCircle, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DatasetCard } from '@/features/datasets/components/dataset-card'
import {
  useDatasets,
  useImportExcel,
  useImportJob,
} from '@/features/datasets/hooks'
import { useOnboardingStore } from '@/features/onboarding/store'
import { runTour } from '@/features/onboarding/tour'

export function HomePage() {
  const navigate = useNavigate()
  const { data: datasets, isPending, isError } = useDatasets()
  const { hasSeenTour } = useOnboardingStore()

  const [sampleJobId, setSampleJobId] = useState<string | null>(null)
  const importExcel = useImportExcel()
  const { data: job } = useImportJob(sampleJobId)

  const recentDatasets = datasets?.slice(0, 6) ?? []

  // Run the home tour once when the page loads if they haven't seen it
  useEffect(() => {
    if (!isPending && !hasSeenTour) {
      // Small timeout ensures the DOM is fully painted
      const timer = setTimeout(() => {
        runTour('/')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [hasSeenTour, isPending])

  // Navigate to the sample dataset overview when import completes
  useEffect(() => {
    if (job?.status === 'done') {
      navigate(`/datasets/${job.dataset}`)
    }
  }, [job?.status, job?.dataset, navigate])

  const onTrySample = async () => {
    try {
      const res = await fetch('/sample-sales.xlsx')
      const blob = await res.blob()
      const file = new File([blob], 'sample-sales.xlsx', { type: blob.type })
      importExcel.mutate(
        { name: 'Sample dataset', file },
        { onSuccess: (created) => setSampleJobId(created.id) },
      )
    } catch (err) {
      console.error('Failed to load sample dataset', err)
    }
  }

  const isImportingSample =
    importExcel.isPending ||
    (job && job.status !== 'error' && job.status !== 'done')

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

          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <p className="text-muted-foreground text-xs">More ways to start:</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onTrySample}
              disabled={isImportingSample}
              data-tour="sample"
            >
              {isImportingSample ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 size-4" />
              )}
              {isImportingSample
                ? 'Importing sample...'
                : 'Try a sample dataset'}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="/sample-sales.xlsx" download>
                Download template
              </a>
            </Button>
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => runTour('/')}
                className="hidden sm:flex"
              >
                <PlayCircle className="mr-2 size-4" />
                Replay tour
              </Button>
              <Button asChild data-tour="import">
                <Link to="/datasets/import">
                  <Upload className="mr-2 size-4" />
                  Import spreadsheet
                </Link>
              </Button>
            </div>
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

          <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-dashed py-8">
            <p className="text-muted-foreground text-sm">Need a quick demo?</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={onTrySample}
              disabled={isImportingSample}
              data-tour="sample"
            >
              {isImportingSample ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 size-4" />
              )}
              {isImportingSample ? 'Importing...' : 'Try a sample dataset'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
