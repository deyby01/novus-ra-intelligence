import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useDatasetOverview,
  useImportExcel,
  useImportJob,
  useRecentDatasets,
} from '@/features/datasets/hooks'
import { useOnboardingStore } from '@/features/onboarding/store'
import { runTour } from '@/features/onboarding/tour'
import { AiHero, type HeroKpi } from '../components/ai-hero'
import { FeaturedOverview } from '../components/featured-overview'
import { RecentActivity } from '../components/recent-activity'
import { RecentDatasets } from '../components/recent-datasets'
import { RecentReports } from '../components/recent-reports'
import { formatNumber } from '../utils'

/** Datasets shown in the "recent" list; the first one is featured above. */
const RECENT_LIMIT = 4

export function HomePage() {
  const navigate = useNavigate()
  // Same query key as <RecentDatasets />, so React Query serves both from one
  // request. The most recent dataset is the one we feature.
  const { data: recentDatasets, isPending } = useRecentDatasets(RECENT_LIMIT)
  const featured = recentDatasets?.[0]
  const { hasSeenHomeTour } = useOnboardingStore()

  // Feed the hero's preview card with the featured overview's top KPIs + chart.
  // Same query key as <FeaturedOverview />, so both share one request.
  const { data: featuredOverview } = useDatasetOverview(featured?.id ?? '')
  const heroKpis: HeroKpi[] | undefined = featuredOverview?.widgets
    .filter((w) => w.chart_type === 'kpi')
    .slice(0, 2)
    .map((w) => ({
      label: w.config.title,
      value: formatNumber(w.results[0]?.value ?? 0),
    }))
  const heroChart = featuredOverview?.widgets.find(
    (w) => w.chart_type === 'bar' || w.chart_type === 'line',
  )
  const heroBars = heroChart?.results.map((r) => r.value ?? 0)

  const [sampleJobId, setSampleJobId] = useState<string | null>(null)
  const importExcel = useImportExcel()
  const { data: job } = useImportJob(sampleJobId)

  // Run the home tour once on first visit.
  useEffect(() => {
    if (!isPending && !hasSeenHomeTour) {
      const timer = setTimeout(() => runTour('/'), 100)
      return () => clearTimeout(timer)
    }
  }, [hasSeenHomeTour, isPending])

  // Navigate to the sample dataset overview when the demo import completes.
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
    Boolean(job && job.status !== 'error' && job.status !== 'done')

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-7 pb-[34px] pt-[26px]">
      <AiHero
        onTrySample={onTrySample}
        isImportingSample={isImportingSample}
        kpis={heroKpis}
        bars={heroBars}
      />

      {/* Header row */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-g900 text-[25px] font-semibold tracking-[-0.02em]">
            Bienvenido de vuelta
          </h2>
          <p className="text-g500 mt-0.5 text-sm">
            Tus datos, ya interpretados.
          </p>
        </div>
        <Link
          to="/datasets"
          className="text-g900 hover:text-g700 inline-flex items-center gap-1.5 text-[13.5px] font-semibold transition-colors"
        >
          Ver todos los reportes
          <ArrowRight className="size-[15px]" strokeWidth={1.5} />
        </Link>
      </div>

      {/* Grid 1: featured overview | recent reports */}
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <FeaturedOverview dataset={featured} />
        <RecentReports />
      </div>

      {/* Grid 2: recent datasets | recent activity */}
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <RecentDatasets />
        <RecentActivity />
      </div>
    </div>
  )
}
