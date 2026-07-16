import { Loader2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDatasetOverview } from '@/features/datasets/hooks'
import type { Dataset, OverviewWidget } from '@/features/datasets/types'
import { useReports } from '@/features/reports/hooks'
import { formatNumber, formatRows, relativeTime, reportExcerpt } from '../utils'

interface FeaturedOverviewProps {
  /** The dataset to feature — the most recently touched one. */
  dataset?: Dataset
}

const MAX_KPIS = 3

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-g200 rounded-[18px] border bg-white px-[26px] py-6">
      {children}
    </div>
  )
}

/** The auto-picked bar/line series, rendered in the design's bar style. */
function OverviewChart({ widget }: { widget: OverviewWidget }) {
  const entries = widget.results.filter((entry) => entry.value !== null)
  const max = Math.max(...entries.map((entry) => entry.value ?? 0), 0)
  const first = entries[0]?.group
  const last = entries[entries.length - 1]?.group

  return (
    <div className="border-g150 bg-g50 mt-3 rounded-[14px] border px-[17px] py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-g500 truncate text-[10.5px] font-semibold uppercase tracking-[0.04em]">
          {widget.config.title}
        </span>
        {first && last && (
          <span className="text-g400 shrink-0 text-[11px]">
            {first === last ? first : `${first} – ${last}`}
          </span>
        )}
      </div>
      <div className="mt-3 flex h-20 items-end gap-2">
        {entries.map((entry, i) => {
          const value = entry.value ?? 0
          const isPeak = max > 0 && value === max
          return (
            <div
              key={`${entry.group}-${i}`}
              title={`${entry.group}: ${formatNumber(value)}`}
              className={`flex-1 rounded-t-[5px] ${isPeak ? 'bg-g900' : 'bg-g300'}`}
              style={{ height: max > 0 ? `${(value / max) * 100}%` : '2%' }}
            />
          )
        })}
      </div>
    </div>
  )
}

/** Block 4 — the featured dataset's auto-generated, schema-driven overview. */
export function FeaturedOverview({ dataset }: FeaturedOverviewProps) {
  const {
    data: overview,
    isPending,
    isError,
    refetch,
    isFetching,
  } = useDatasetOverview(dataset?.id ?? '')
  const { data: reports } = useReports(dataset?.id ?? '')

  if (!dataset) {
    return (
      <Panel>
        <div className="py-10 text-center">
          <span className="bg-g100 text-g600 mx-auto grid size-12 place-items-center rounded-xl">
            <Sparkles className="size-5" strokeWidth={1.5} />
          </span>
          <h3 className="font-display text-g900 mt-3 text-[17px] font-semibold">
            Aún no hay nada que analizar
          </h3>
          <p className="text-g500 mx-auto mt-1 max-w-xs text-[13px]">
            Importa un Excel y la IA generará el overview automáticamente.
          </p>
          <Link
            to="/datasets/import"
            className="bg-g900 font-display hover:bg-g800 mt-4 inline-block rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors"
          >
            Importar Excel
          </Link>
        </div>
      </Panel>
    )
  }

  const kpis =
    overview?.widgets
      .filter((w) => w.chart_type === 'kpi')
      .slice(0, MAX_KPIS) ?? []
  const chart = overview?.widgets.find(
    (w) => w.chart_type === 'bar' || w.chart_type === 'line',
  )

  // The AI's reading = an excerpt of the dataset's latest completed report.
  // The list is ordered newest-first, so the first completed one is the latest.
  const latestReport = reports?.find((r) => r.status === 'COMPLETED')
  const aiReading = latestReport ? reportExcerpt(latestReport.content) : ''

  return (
    <Panel>
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="bg-g900 grid size-[38px] shrink-0 place-items-center rounded-xl text-white">
          <Sparkles className="size-[19px]" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 grow">
          <h3 className="font-display text-g900 truncate text-[19px] font-semibold">
            Overview · {dataset.name}
          </h3>
          <p className="text-g500 text-xs">
            {overview
              ? `${relativeTime(overview.headline.generated_at)} · ${formatRows(overview.headline.row_count)}`
              : formatRows(dataset.row_count)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="border-g200 bg-g100 text-g700 hover:bg-g150 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-60"
        >
          {isFetching ? (
            <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} />
          ) : (
            <Sparkles className="size-3.5" strokeWidth={1.5} />
          )}
          Regenerar
        </button>
      </div>

      {isPending && (
        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((key) => (
              <div
                key={key}
                className="bg-g50 h-[86px] animate-pulse rounded-[14px]"
              />
            ))}
          </div>
          <div className="bg-g50 h-[132px] animate-pulse rounded-[14px]" />
        </div>
      )}

      {isError && (
        <p className="text-g500 mt-5 py-8 text-center text-[13px]">
          No pudimos generar el overview. Intenta de nuevo.
        </p>
      )}

      {overview && kpis.length === 0 && !chart && (
        <p className="text-g500 mt-5 py-8 text-center text-[13px]">
          Este dataset todavía no tiene datos suficientes para un overview.
        </p>
      )}

      {/* KPI cards — derived from the dataset's own schema */}
      {kpis.length > 0 && (
        <div
          className="mt-5 grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))`,
          }}
        >
          {kpis.map((kpi, i) => (
            <div
              key={`${kpi.config.title}-${i}`}
              className="border-g150 bg-g50 rounded-[14px] border px-[15px] py-3.5"
            >
              <div className="text-g500 truncate text-[10.5px] font-semibold uppercase tracking-[0.04em]">
                {kpi.config.title}
              </div>
              <div className="font-display text-g900 mt-1.5 text-[25px] font-semibold tracking-[-0.01em]">
                {formatNumber(kpi.results[0]?.value ?? 0)}
              </div>
            </div>
          ))}
        </div>
      )}

      {chart && <OverviewChart widget={chart} />}

      {/* AI reading — an excerpt of the dataset's latest completed report. */}
      {overview && (kpis.length > 0 || chart) && (
        <div className="bg-g900 mt-3 flex items-start gap-2.5 rounded-[14px] px-4 py-3.5">
          <Sparkles
            className="mt-0.5 size-[18px] shrink-0 text-white"
            strokeWidth={1.5}
          />
          <p className="text-[13px] leading-relaxed text-white/80">
            <span className="font-display font-semibold text-white">
              Lectura de la IA:
            </span>{' '}
            {aiReading ||
              'genera un reporte de este dataset para ver la interpretación.'}
          </p>
        </div>
      )}
    </Panel>
  )
}
