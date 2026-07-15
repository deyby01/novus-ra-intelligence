import { ArrowUpRight, Sparkles } from 'lucide-react'

// Sample data (README: fictional SMB — swap for the featured dataset's real
// overview + AI reading once wired to the backend).
const kpis = [
  { label: 'Ingresos', value: '$142.850', delta: '12,4%', trend: true },
  { label: 'Margen', value: '34,2%', delta: '+1,8 pts', trend: false },
  { label: 'Pedidos', value: '1.662', delta: '9,0%', trend: true },
]

const bars = [
  { h: 42, tone: 'light' },
  { h: 56, tone: 'light' },
  { h: 48, tone: 'light' },
  { h: 70, tone: 'light' },
  { h: 90, tone: 'ink' },
  { h: 64, tone: 'mid' },
] as const

const barTone: Record<string, string> = {
  light: 'bg-g300',
  mid: 'bg-g600',
  ink: 'bg-g900',
}

/** Block 4 — the featured, AI-generated overview of a dataset. */
export function FeaturedOverview() {
  return (
    <div className="border-g200 rounded-[18px] border bg-white px-[26px] py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="bg-g900 grid size-[38px] shrink-0 place-items-center rounded-xl text-white">
          <Sparkles className="size-[19px]" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 grow">
          <h3 className="font-display text-g900 text-[19px] font-semibold">
            Overview · Ventas Q3
          </h3>
          <p className="text-g500 text-xs">hace 2 h · 1.662 filas</p>
        </div>
        <button
          type="button"
          className="border-g200 bg-g100 text-g700 hover:bg-g150 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
        >
          <Sparkles className="size-3.5" strokeWidth={1.5} />
          Regenerar
        </button>
      </div>

      {/* KPI cards */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="border-g150 bg-g50 rounded-[14px] border px-[15px] py-3.5"
          >
            <div className="text-g500 text-[10.5px] font-semibold uppercase tracking-[0.04em]">
              {kpi.label}
            </div>
            <div className="font-display text-g900 mt-1.5 text-[25px] font-semibold tracking-[-0.01em]">
              {kpi.value}
            </div>
            {kpi.trend ? (
              <span className="bg-g150 text-g700 mt-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                <ArrowUpRight className="size-3" strokeWidth={2} />
                {kpi.delta}
              </span>
            ) : (
              <span className="text-g500 mt-2 inline-block text-[11px] font-semibold">
                {kpi.delta}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="border-g150 bg-g50 mt-3 rounded-[14px] border px-[17px] py-4">
        <div className="flex items-center justify-between">
          <span className="text-g500 text-[10.5px] font-semibold uppercase tracking-[0.04em]">
            Ingresos por mes
          </span>
          <span className="text-g400 text-[11px]">ene – jun</span>
        </div>
        <div className="mt-3 flex h-20 items-end gap-2">
          {bars.map((bar, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-[5px] ${barTone[bar.tone]}`}
              style={{ height: `${bar.h}%` }}
            />
          ))}
        </div>
      </div>

      {/* AI reading */}
      <div className="bg-g900 mt-3 flex items-start gap-2.5 rounded-[14px] px-4 py-3.5">
        <Sparkles
          className="mt-0.5 size-[18px] shrink-0 text-white"
          strokeWidth={1.5}
        />
        <p className="text-[13px] leading-relaxed text-white">
          <span className="font-display font-semibold">Lectura de la IA:</span>{' '}
          <span className="text-white/80">
            mayo cerró como el mejor mes del trimestre (+18%). El margen se
            mantiene sano pese a la caída del ticket promedio.
          </span>
        </p>
      </div>
    </div>
  )
}
