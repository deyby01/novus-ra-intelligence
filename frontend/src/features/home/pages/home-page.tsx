import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useDatasets,
  useImportExcel,
  useImportJob,
} from '@/features/datasets/hooks'
import { useOnboardingStore } from '@/features/onboarding/store'
import { runTour } from '@/features/onboarding/tour'
import { AiHero } from '../components/ai-hero'
import { FeaturedOverview } from '../components/featured-overview'
import { RecentActivity } from '../components/recent-activity'
import { RecentDatasets } from '../components/recent-datasets'
import { RecentReports } from '../components/recent-reports'

export function HomePage() {
  const navigate = useNavigate()
  const { isPending } = useDatasets()
  const { hasSeenHomeTour } = useOnboardingStore()

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
      <AiHero onTrySample={onTrySample} isImportingSample={isImportingSample} />

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
        <FeaturedOverview />
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
