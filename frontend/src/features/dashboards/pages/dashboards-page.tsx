import {
  Database,
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { formatNumber } from '@/features/home/utils'
import { CreateDashboardDialog } from '../components/create-dashboard-dialog'
import { DashboardCard } from '../components/dashboard-card'
import { GenerateWithAiDialog } from '../components/generate-with-ai-dialog'
import { useDashboards } from '../hooks'
import type { Dashboard } from '../types'

type DashboardFilter = 'all' | 'recent' | 'mine'
type ViewMode = 'grid' | 'list'

const FILTERS: { value: DashboardFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'recent', label: 'Recientes' },
  { value: 'mine', label: 'Míos' },
]

function isToday(iso: string): boolean {
  const date = new Date(iso)
  const now = new Date()
  return date.toDateString() === now.toDateString()
}

/** The "Editado" KPI value: "hoy" / "ayer" / a day count. */
function lastEditedLabel(dashboards: Dashboard[]): string {
  if (dashboards.length === 0) return '—'
  const latest = Math.max(
    ...dashboards.map((d) => new Date(d.updated_at).getTime()),
  )
  if (isToday(new Date(latest).toISOString())) return 'hoy'
  const days = Math.floor((Date.now() - latest) / 86_400_000)
  if (days <= 1) return 'ayer'
  return `hace ${days} d`
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-g200 rounded-[14px] border bg-white px-[17px] py-[15px]">
      <div className="text-g500 text-[10.5px] font-semibold uppercase tracking-[0.04em]">
        {label}
      </div>
      <div className="font-display text-g900 mt-1 text-[26px] font-semibold tracking-[-0.01em]">
        {value}
      </div>
    </div>
  )
}

/** A dashboard shown as a compact row in list view. */
function DashboardRow({ dashboard }: { dashboard: Dashboard }) {
  return (
    <Link
      to={`/dashboards/${dashboard.id}`}
      className="border-g200 hover:border-g300 flex items-center gap-4 rounded-[14px] border bg-white px-4 py-3 transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
    >
      <span className="min-w-0 grow">
        <span className="font-display text-g900 block truncate text-[14.5px] font-semibold">
          {dashboard.name}
        </span>
        <span className="text-g400 inline-flex items-center gap-3 text-[11.5px]">
          <span className="inline-flex items-center gap-1.5">
            <LayoutGrid className="size-[11px]" strokeWidth={1.5} />
            {dashboard.widget_types.length} widgets
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Database className="size-3" strokeWidth={1.5} />
            {dashboard.dataset_ids.length} datasets
          </span>
        </span>
      </span>
    </Link>
  )
}

/** The create tile that closes the grid. */
function CreateTile() {
  return (
    <div className="border-g300 flex min-h-[250px] flex-col items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-dashed bg-white px-[19px] py-[18px] text-center">
      <span className="bg-g100 text-g600 grid size-[46px] place-items-center rounded-[13px]">
        <Plus className="size-[22px]" strokeWidth={1.5} />
      </span>
      <h3 className="font-display text-g900 mt-1 text-[15px] font-semibold">
        Nuevo dashboard
      </h3>
      <p className="text-g500 max-w-[240px] text-[12px] leading-relaxed">
        Empieza en blanco y añade widgets, o deja que la IA lo arme desde un
        dataset.
      </p>
      <div className="mt-1 flex items-center gap-2">
        <CreateDashboardDialog>
          <button
            type="button"
            className="bg-g900 font-display hover:bg-g800 rounded-[10px] px-4 py-2 text-[12.5px] font-semibold text-white transition-colors"
          >
            En blanco
          </button>
        </CreateDashboardDialog>
        <GenerateWithAiDialog>
          <button
            type="button"
            className="bg-g100 text-g700 font-display hover:bg-g150 inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[12.5px] font-semibold transition-colors"
          >
            <Sparkles className="size-[14px]" strokeWidth={1.5} />
            Con IA
          </button>
        </GenerateWithAiDialog>
      </div>
    </div>
  )
}

export function DashboardsPage() {
  const { data: dashboards, isPending, isError } = useDashboards()
  const currentUserId = useAuthStore((state) => state.user?.id ?? null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<DashboardFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const kpis = useMemo(() => {
    const all = dashboards ?? []
    const datasets = new Set(all.flatMap((d) => d.dataset_ids))
    return {
      total: all.length,
      widgets: all.reduce((sum, d) => sum + d.widget_types.length, 0),
      datasets: datasets.size,
      edited: lastEditedLabel(all),
    }
  }, [dashboards])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    let list = (dashboards ?? []).filter((d) => {
      const matchesQuery = !term || d.name.toLowerCase().includes(term)
      const matchesMine =
        filter !== 'mine' || !currentUserId || d.created_by === currentUserId
      return matchesQuery && matchesMine
    })
    if (filter === 'recent') {
      list = [...list].sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
    }
    return list
  }, [dashboards, query, filter, currentUserId])

  const hasDashboards = Boolean(dashboards && dashboards.length > 0)

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-7 pb-[34px] pt-[26px]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-g900 text-[32px] font-semibold tracking-[-0.025em]">
            Dashboards
          </h1>
          <p className="text-g500 mt-0.5 text-sm">
            Los dashboards que visualizan los datos de este workspace.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <GenerateWithAiDialog>
            <button
              type="button"
              className="border-g200 text-g700 font-display hover:bg-g100 inline-flex items-center gap-1.5 rounded-[12px] border bg-white px-[17px] py-[11px] text-[13.5px] font-semibold transition-colors"
            >
              <Sparkles className="size-4" strokeWidth={1.5} />
              Generar con IA
            </button>
          </GenerateWithAiDialog>
          <CreateDashboardDialog>
            <button
              type="button"
              className="bg-g900 font-display hover:bg-g800 inline-flex items-center gap-1.5 rounded-[12px] px-[18px] py-[11px] text-[13.5px] font-semibold text-white transition-colors"
            >
              <Plus className="size-4" strokeWidth={1.5} />
              Nuevo dashboard
            </button>
          </CreateDashboardDialog>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isPending ? (
          [0, 1, 2, 3].map((key) => (
            <div
              key={key}
              className="bg-g100 h-[74px] animate-pulse rounded-[14px]"
            />
          ))
        ) : (
          <>
            <Kpi label="Dashboards" value={formatNumber(kpis.total)} />
            <Kpi label="Widgets totales" value={formatNumber(kpis.widgets)} />
            <Kpi
              label="Datasets conectados"
              value={formatNumber(kpis.datasets)}
            />
            <Kpi label="Editado" value={kpis.edited} />
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="border-g200 flex flex-1 items-center gap-2.5 rounded-[12px] border bg-white px-[15px] py-2.5">
          <Search className="text-g400 size-4 shrink-0" strokeWidth={1.5} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar dashboards…"
            className="text-g900 placeholder:text-g400 w-full bg-transparent text-[13.5px] outline-none"
          />
        </label>

        <div className="border-g200 flex items-center gap-0.5 rounded-full border bg-white p-[3px]">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-full px-[15px] py-[7px] text-[12.5px] transition-colors ${
                filter === option.value
                  ? 'bg-g900 font-semibold text-white'
                  : 'text-g500 hover:bg-g100 font-medium'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="border-g200 flex items-center gap-0.5 rounded-[12px] border bg-white p-[3px]">
          {[
            {
              mode: 'grid' as const,
              icon: LayoutGrid,
              label: 'Vista de cuadrícula',
            },
            { mode: 'list' as const, icon: List, label: 'Vista de lista' },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              aria-label={label}
              aria-pressed={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={`grid size-[30px] place-items-center rounded-[9px] transition-colors ${
                viewMode === mode
                  ? 'bg-g900 text-white'
                  : 'text-g500 hover:bg-g100'
              }`}
            >
              <Icon className="size-4" strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isError && (
        <p className="border-g200 text-g500 rounded-[16px] border bg-white px-6 py-16 text-center text-sm">
          No pudimos cargar tus dashboards. Intenta de nuevo.
        </p>
      )}

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="bg-g100 h-[268px] animate-pulse rounded-[16px]"
            />
          ))}
        </div>
      )}

      {/* Empty workspace */}
      {dashboards && !hasDashboards && (
        <div className="border-g300 flex flex-col items-center gap-3 rounded-[16px] border-[1.5px] border-dashed bg-white px-6 py-16 text-center">
          <span className="bg-g100 text-g600 grid size-14 place-items-center rounded-[14px]">
            <LayoutGrid className="size-6" strokeWidth={1.5} />
          </span>
          <h2 className="font-display text-g900 text-xl font-semibold">
            Aún no hay dashboards
          </h2>
          <p className="text-g500 max-w-sm text-sm">
            Crea un dashboard para reunir tus datasets en gráficos, KPIs y
            tablas.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <CreateDashboardDialog>
              <button
                type="button"
                className="bg-g900 font-display hover:bg-g800 inline-flex items-center gap-1.5 rounded-[12px] px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors"
              >
                <Plus className="size-4" strokeWidth={1.5} />
                Nuevo dashboard
              </button>
            </CreateDashboardDialog>
            <GenerateWithAiDialog>
              <button
                type="button"
                className="bg-g100 text-g700 font-display hover:bg-g150 inline-flex items-center gap-1.5 rounded-[12px] px-5 py-2.5 text-[13.5px] font-semibold transition-colors"
              >
                <Sparkles className="size-4" strokeWidth={1.5} />
                Generar con IA
              </button>
            </GenerateWithAiDialog>
          </div>
        </div>
      )}

      {/* No match */}
      {hasDashboards && visible.length === 0 && (
        <p className="border-g200 text-g500 rounded-[16px] border bg-white px-6 py-16 text-center text-sm">
          Sin dashboards que coincidan con tu búsqueda.
        </p>
      )}

      {/* Grid */}
      {hasDashboards && visible.length > 0 && viewMode === 'grid' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((dashboard) => (
            <DashboardCard key={dashboard.id} dashboard={dashboard} />
          ))}
          <CreateTile />
        </div>
      )}

      {/* List */}
      {hasDashboards && visible.length > 0 && viewMode === 'list' && (
        <div className="flex flex-col gap-2.5">
          {visible.map((dashboard) => (
            <DashboardRow key={dashboard.id} dashboard={dashboard} />
          ))}
        </div>
      )}
    </div>
  )
}
