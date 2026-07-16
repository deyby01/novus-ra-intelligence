import {
  AlertTriangle,
  ChevronRight,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDatasets } from '@/features/datasets/hooks'
import { useGenerateReport, useRecentReports } from '@/features/reports/hooks'
import type { Report } from '@/features/reports/types'
import { relativeTime } from '../utils'

const RECENT_LIMIT = 3

function StatusIcon({ status }: { status: Report['status'] }) {
  if (status === 'PENDING') {
    return <Loader2 className="size-[17px] animate-spin" strokeWidth={1.5} />
  }
  if (status === 'FAILED') {
    return <AlertTriangle className="size-[17px]" strokeWidth={1.5} />
  }
  return <FileText className="size-[17px]" strokeWidth={1.5} />
}

function statusMeta(report: Report): string {
  if (report.status === 'PENDING') return 'Generando…'
  if (report.status === 'FAILED') return 'Falló · vuelve a intentarlo'
  return relativeTime(report.created_at)
}

/** Block 5 — the workspace's latest AI reports, plus a CTA to request one. */
export function RecentReports() {
  const navigate = useNavigate()
  const { data: reports, isPending, isError } = useRecentReports(RECENT_LIMIT)
  const { data: datasets } = useDatasets()
  const generate = useGenerateReport(RECENT_LIMIT)

  const hasDatasets = Boolean(datasets?.length)

  return (
    <div>
      <h3 className="font-display text-g900 text-[17px] font-semibold">
        Reportes recientes
      </h3>

      <div className="mt-3 flex flex-col gap-2.5">
        {isPending &&
          [0, 1, 2].map((key) => (
            <div
              key={key}
              className="border-g200 flex items-center gap-3 rounded-[14px] border bg-white px-[15px] py-[13px]"
            >
              <div className="bg-g100 size-[34px] shrink-0 animate-pulse rounded-[11px]" />
              <div className="grow space-y-1.5">
                <div className="bg-g100 h-3 w-2/3 animate-pulse rounded" />
                <div className="bg-g100 h-2.5 w-1/3 animate-pulse rounded" />
              </div>
            </div>
          ))}

        {isError && (
          <p className="border-g200 text-g500 rounded-[14px] border bg-white px-4 py-6 text-center text-[13px]">
            No pudimos cargar tus reportes.
          </p>
        )}

        {reports?.length === 0 && (
          <p className="border-g200 text-g500 rounded-[14px] border bg-white px-4 py-6 text-center text-[13px]">
            Aún no has generado reportes. La IA los escribe por ti a partir de
            un dataset.
          </p>
        )}

        {reports?.map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => navigate(`/datasets/${report.dataset}`)}
            className="border-g200 hover:border-g300 flex items-center gap-3 rounded-[14px] border bg-white px-[15px] py-[13px] text-left transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          >
            <span
              className={`grid size-[34px] shrink-0 place-items-center rounded-[11px] ${
                report.status === 'FAILED'
                  ? 'bg-g900 text-white'
                  : 'bg-g100 text-g700'
              }`}
            >
              <StatusIcon status={report.status} />
            </span>
            <span className="min-w-0 grow">
              <span className="font-display text-g900 block truncate text-[13.5px] font-semibold">
                Reporte — {report.dataset_name}
              </span>
              <span className="text-g500 block text-[11.5px]">
                {statusMeta(report)}
              </span>
            </span>
            <ChevronRight
              className="text-g400 size-[15px] shrink-0"
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      {/* Generate: pick which dataset the AI should analyse. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={!hasDatasets || generate.isPending}
            className="bg-g900 font-display hover:bg-g800 mt-2.5 flex w-full items-center justify-center gap-2 rounded-[13px] py-3.5 text-[13.5px] font-semibold text-white transition-colors disabled:opacity-60"
          >
            {generate.isPending ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Sparkles className="size-4" strokeWidth={1.5} />
            )}
            {hasDatasets
              ? 'Generar nuevo reporte'
              : 'Importa un dataset para generar reportes'}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {datasets?.map((dataset) => (
            <DropdownMenuItem
              key={dataset.id}
              onClick={() => generate.mutate({ dataset: dataset.id })}
            >
              <span className="truncate">{dataset.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {generate.isError && (
        <p className="text-g500 mt-2 text-center text-[11.5px]">
          No pudimos iniciar el reporte. Intenta de nuevo.
        </p>
      )}
    </div>
  )
}
