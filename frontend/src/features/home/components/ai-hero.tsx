import { Loader2, PlayCircle, Sparkles, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'

/** A headline number from the featured overview, already formatted. */
export interface HeroKpi {
  label: string
  value: string
}

interface AiHeroProps {
  onTrySample: () => void
  isImportingSample: boolean
  /** Top KPIs of the featured overview; the sample preview shows if omitted. */
  kpis?: HeroKpi[]
  /** Bar heights (0–100) from the featured chart; sample bars show if omitted. */
  bars?: number[]
}

// Sample preview data (README: fictional SMB) — shown only until there is a
// real dataset to feature.
const sampleKpis: HeroKpi[] = [
  { label: 'Ingresos', value: '$142.850' },
  { label: 'Margen', value: '34,2%' },
]
const sampleBars = [40, 58, 50, 76, 92, 68]

const barTone: Record<string, string> = {
  faint: 'bg-white/24',
  bright: 'bg-white',
}

/** Dark AI hero band — the "import Excel → AI does the rest" hook. */
export function AiHero({
  onTrySample,
  isImportingSample,
  kpis,
  bars,
}: AiHeroProps) {
  const previewKpis = kpis && kpis.length > 0 ? kpis.slice(0, 2) : sampleKpis
  const previewBars = bars && bars.length > 0 ? bars : sampleBars
  const peak = Math.max(...previewBars)
  return (
    <section
      data-tour="import"
      className="bg-g950 relative overflow-hidden rounded-[20px] px-10 py-[38px] text-white"
    >
      {/* Dot texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[size:22px_22px]"
      />

      <div className="relative grid items-center gap-10 lg:grid-cols-[1.12fr_1fr]">
        {/* Left column */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.14] bg-white/[0.08] px-3.5 py-1.5 text-xs font-semibold text-g300">
            <Sparkles className="size-3.5" strokeWidth={1.5} />
            Inteligencia de negocio · IA
          </span>

          <h1 className="font-display mt-5 max-w-[16ch] text-[46px] font-semibold leading-[1.02] tracking-[-0.025em]">
            Convierte tu Excel en decisiones.
          </h1>

          <p className="mt-4 max-w-[46ch] text-[15.5px] leading-[1.6] text-white/70">
            Importa una hoja y la IA genera dashboards, KPIs y un resumen
            ejecutivo — listo para leer, no para armar.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/datasets/import"
              className="text-g950 font-display hover:bg-g100 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold transition-colors"
            >
              <Upload className="size-[17px]" strokeWidth={1.5} />
              Importar Excel
            </Link>
            <button
              type="button"
              onClick={onTrySample}
              disabled={isImportingSample}
              className="font-display inline-flex items-center gap-2 rounded-xl border border-white/[0.28] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              {isImportingSample ? (
                <Loader2
                  className="size-[17px] animate-spin"
                  strokeWidth={1.5}
                />
              ) : (
                <PlayCircle className="size-[17px]" strokeWidth={1.5} />
              )}
              {isImportingSample ? 'Cargando…' : 'Probar demo'}
            </button>
          </div>
        </div>

        {/* Right column — preview card */}
        <div className="rounded-2xl border border-white/[0.13] bg-white/[0.05] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="font-display text-[13.5px] font-semibold text-white">
              Overview generado
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.09] px-2 py-0.5 text-[10px] font-semibold text-g300">
              <Sparkles className="size-3" strokeWidth={1.5} />
              AUTO
            </span>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            {previewKpis.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[11px] bg-white/[0.05] px-3 py-2.5"
              >
                <div className="truncate text-[9.5px] font-semibold uppercase tracking-[0.04em] text-g400">
                  {stat.label}
                </div>
                <div className="font-display mt-1 truncate text-xl font-semibold text-white">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex h-24 items-end gap-1.5 rounded-[11px] bg-white/[0.05] p-3">
            {previewBars.map((height, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-[3px] ${
                  peak > 0 && height === peak ? barTone.bright : barTone.faint
                }`}
                style={{ height: `${peak > 0 ? (height / peak) * 100 : 2}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
