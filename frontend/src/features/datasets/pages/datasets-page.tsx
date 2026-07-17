import {
  ArrowRight,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatNumber } from '@/features/home/utils'
import { CreateManualDatasetDialog } from '../components/create-manual-dataset-dialog'
import { DatasetCard } from '../components/dataset-card'
import { useDatasets } from '../hooks'
import type { Dataset } from '../types'

type TypeFilter = 'all' | 'excel' | 'manual'
type ViewMode = 'grid' | 'list'

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'excel', label: 'Excel' },
  { value: 'manual', label: 'Manual' },
]

/** One metric in the KPI strip. */
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

/** A dataset shown as a compact row in list view. */
function DatasetRow({ dataset }: { dataset: Dataset }) {
  return (
    <div className="border-g200 hover:border-g300 flex items-center gap-4 rounded-[14px] border bg-white px-4 py-3 transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="min-w-0 grow">
        <Link
          to={`/datasets/${dataset.id}`}
          className="font-display text-g900 block truncate text-[14.5px] font-semibold hover:underline"
        >
          {dataset.name}
        </Link>
        <span className="text-g400 text-[11.5px]">
          {dataset.source === 'excel' ? 'Excel' : 'Manual'} ·{' '}
          {formatNumber(dataset.row_count)} filas ·{' '}
          {formatNumber(dataset.field_count)} cols
        </span>
      </div>
      <Link
        to={`/datasets/${dataset.id}`}
        className="bg-g900 font-display hover:bg-g800 inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12.5px] font-semibold text-white transition-colors"
      >
        <Sparkles className="size-[14px]" strokeWidth={1.5} />
        Overview IA
      </Link>
    </div>
  )
}

/** The import tile that closes the grid. */
function ImportTile() {
  return (
    <div className="border-g300 flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-dashed bg-white px-[19px] py-[18px] text-center">
      <span className="bg-g100 text-g600 grid size-[46px] place-items-center rounded-[13px]">
        <Upload className="size-[22px]" strokeWidth={1.5} />
      </span>
      <h3 className="font-display text-g900 mt-1 text-[15px] font-semibold">
        Importar otro Excel
      </h3>
      <p className="text-g500 max-w-[220px] text-[12px] leading-relaxed">
        Arrastra un .xlsx o .csv y la IA lo convierte en dashboard.
      </p>
      <Link
        to="/datasets/import"
        className="bg-g900 font-display hover:bg-g800 mt-1 rounded-[10px] px-4 py-2 text-[12.5px] font-semibold text-white transition-colors"
      >
        Seleccionar archivo
      </Link>
    </div>
  )
}

export function DatasetsPage() {
  const { data: datasets, isPending, isError } = useDatasets()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const kpis = useMemo(() => {
    const all = datasets ?? []
    return {
      total: all.length,
      rows: all.reduce((sum, d) => sum + d.row_count, 0),
      imported: all.filter((d) => d.source === 'excel').length,
      withOverview: all.filter((d) => d.has_report).length,
    }
  }, [datasets])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (datasets ?? []).filter((d) => {
      const matchesType = typeFilter === 'all' || d.source === typeFilter
      const matchesQuery =
        !term ||
        d.name.toLowerCase().includes(term) ||
        d.description.toLowerCase().includes(term)
      return matchesType && matchesQuery
    })
  }, [datasets, query, typeFilter])

  const hasDatasets = Boolean(datasets && datasets.length > 0)

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-7 pb-[34px] pt-[26px]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-g900 text-[32px] font-semibold tracking-[-0.025em]">
            Datasets
          </h1>
          <p className="text-g500 mt-0.5 text-sm">
            Los datasets importados y manuales de este workspace.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <CreateManualDatasetDialog />
          <Link
            to="/datasets/import"
            className="bg-g900 font-display hover:bg-g800 inline-flex items-center gap-1.5 rounded-[12px] px-[18px] py-[11px] text-[13.5px] font-semibold text-white transition-colors"
          >
            <Upload className="size-4" strokeWidth={1.5} />
            Importar Excel
          </Link>
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
            <Kpi label="Datasets" value={formatNumber(kpis.total)} />
            <Kpi label="Filas totales" value={formatNumber(kpis.rows)} />
            <Kpi label="Importados" value={formatNumber(kpis.imported)} />
            <Kpi
              label="Con overview IA"
              value={formatNumber(kpis.withOverview)}
            />
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
            placeholder="Buscar datasets…"
            className="text-g900 placeholder:text-g400 w-full bg-transparent text-[13.5px] outline-none"
          />
        </label>

        <div className="border-g200 flex items-center gap-0.5 rounded-full border bg-white p-[3px]">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setTypeFilter(filter.value)}
              className={`rounded-full px-[15px] py-[7px] text-[12.5px] transition-colors ${
                typeFilter === filter.value
                  ? 'bg-g900 font-semibold text-white'
                  : 'text-g500 hover:bg-g100 font-medium'
              }`}
            >
              {filter.label}
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
          No pudimos cargar tus datasets. Intenta de nuevo.
        </p>
      )}

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="bg-g100 h-[232px] animate-pulse rounded-[16px]"
            />
          ))}
        </div>
      )}

      {/* Empty workspace — no datasets at all */}
      {datasets && !hasDatasets && (
        <div className="border-g300 flex flex-col items-center gap-3 rounded-[16px] border-[1.5px] border-dashed bg-white px-6 py-20 text-center">
          <span className="bg-g100 text-g600 grid size-14 place-items-center rounded-[14px]">
            <Upload className="size-6" strokeWidth={1.5} />
          </span>
          <h2 className="font-display text-g900 text-xl font-semibold">
            Aún no hay datasets
          </h2>
          <p className="text-g500 max-w-sm text-sm">
            Importa un Excel y la IA lo convierte en un dataset con dashboard,
            KPIs y un resumen ejecutivo.
          </p>
          <Link
            to="/datasets/import"
            className="bg-g900 font-display hover:bg-g800 mt-2 inline-flex items-center gap-1.5 rounded-[12px] px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors"
          >
            <Upload className="size-4" strokeWidth={1.5} />
            Importar Excel
          </Link>
        </div>
      )}

      {/* No search/filter matches */}
      {hasDatasets && filtered.length === 0 && (
        <p className="border-g200 text-g500 rounded-[16px] border bg-white px-6 py-16 text-center text-sm">
          Sin datasets que coincidan con tu búsqueda.
        </p>
      )}

      {/* Grid view */}
      {hasDatasets && filtered.length > 0 && viewMode === 'grid' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} />
          ))}
          <ImportTile />
        </div>
      )}

      {/* List view */}
      {hasDatasets && filtered.length > 0 && viewMode === 'list' && (
        <div className="flex flex-col gap-2.5">
          {filtered.map((dataset) => (
            <DatasetRow key={dataset.id} dataset={dataset} />
          ))}
          <Link
            to="/datasets/import"
            className="border-g300 text-g600 hover:bg-g50 flex items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed bg-white px-4 py-3.5 text-[13px] font-semibold transition-colors"
          >
            <Upload className="size-4" strokeWidth={1.5} />
            Importar otro Excel
            <ArrowRight className="size-4" strokeWidth={1.5} />
          </Link>
        </div>
      )}
    </div>
  )
}
