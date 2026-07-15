import {
  AlertTriangle,
  ChevronRight,
  FileText,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

interface ReportItem {
  title: string
  meta: string
  icon: LucideIcon
  alert?: boolean
}

// Sample data (README) — swap for the user's recent reports once wired.
const reports: ReportItem[] = [
  { title: 'Resumen ejecutivo — Ventas Q3', meta: 'hace 2 h', icon: FileText },
  {
    title: 'Anomalías en Cobranza',
    meta: 'ayer · 3 hallazgos',
    icon: AlertTriangle,
    alert: true,
  },
  {
    title: 'Tendencia de inventario 90 d',
    meta: 'hace 3 d',
    icon: TrendingUp,
  },
]

/** Block 5 — recent AI reports + a CTA to generate a new one. */
export function RecentReports() {
  return (
    <div>
      <h3 className="font-display text-g900 text-[17px] font-semibold">
        Reportes recientes
      </h3>

      <div className="mt-3 flex flex-col gap-2.5">
        {reports.map((report) => (
          <button
            key={report.title}
            type="button"
            className="border-g200 group flex items-center gap-3 rounded-[14px] border bg-white px-[15px] py-[13px] text-left transition-all hover:border-g300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          >
            <span
              className={`grid size-[34px] shrink-0 place-items-center rounded-[11px] ${
                report.alert ? 'bg-g900 text-white' : 'bg-g100 text-g700'
              }`}
            >
              <report.icon className="size-[17px]" strokeWidth={1.5} />
            </span>
            <span className="min-w-0 grow">
              <span className="font-display text-g900 block truncate text-[13.5px] font-semibold">
                {report.title}
              </span>
              <span className="text-g500 block text-[11.5px]">
                {report.meta}
              </span>
            </span>
            <ChevronRight
              className="text-g400 size-[15px] shrink-0"
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      <button
        type="button"
        className="bg-g900 font-display hover:bg-g800 mt-2.5 flex w-full items-center justify-center gap-2 rounded-[13px] py-3.5 text-[13.5px] font-semibold text-white transition-colors"
      >
        <Sparkles className="size-4" strokeWidth={1.5} />
        Generar nuevo reporte
      </button>
    </div>
  )
}
