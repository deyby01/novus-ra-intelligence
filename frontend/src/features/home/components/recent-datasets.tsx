import { FileSpreadsheet, Pencil } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useRecentDatasets } from '@/features/datasets/hooks'
import type { DatasetSource } from '@/features/datasets/types'

const RECENT_LIMIT = 4

const sourceLabel: Record<DatasetSource, string> = {
  excel: 'Excel',
  manual: 'Manual',
}

function SourceIcon({ source }: { source: DatasetSource }) {
  const Icon = source === 'manual' ? Pencil : FileSpreadsheet
  return <Icon className="size-[17px]" strokeWidth={1.5} />
}

function formatRows(count: number): string {
  // Group thousands with "." explicitly: `toLocaleString` depends on the
  // runtime's ICU data, so it silently stops grouping under Node's small-icu
  // build (tests/CI) while grouping in the browser.
  const grouped = count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${grouped} ${count === 1 ? 'fila' : 'filas'}`
}

/** Block 6 — the workspace's most recently touched datasets. */
export function RecentDatasets() {
  const navigate = useNavigate()
  const { data: datasets, isPending, isError } = useRecentDatasets(RECENT_LIMIT)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-g900 text-[17px] font-semibold">
          Datasets recientes
        </h3>
        <Link
          to="/datasets"
          className="text-g900 hover:text-g700 text-[13px] font-semibold transition-colors"
        >
          Ver todos
        </Link>
      </div>

      <div className="border-g200 mt-3 overflow-hidden rounded-2xl border bg-white">
        {isPending &&
          [0, 1, 2, 3].map((key) => (
            <div
              key={key}
              className={`flex items-center gap-3 px-4 py-3.5 ${
                key < 3 ? 'border-g150 border-b' : ''
              }`}
            >
              <div className="bg-g100 size-[34px] shrink-0 animate-pulse rounded-[11px]" />
              <div className="grow space-y-1.5">
                <div className="bg-g100 h-3 w-1/3 animate-pulse rounded" />
                <div className="bg-g100 h-2.5 w-1/2 animate-pulse rounded" />
              </div>
            </div>
          ))}

        {isError && (
          <p className="text-g500 px-4 py-8 text-center text-[13px]">
            No pudimos cargar tus datasets. Intenta de nuevo.
          </p>
        )}

        {datasets?.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-g500 text-[13px]">
              Aún no tienes datasets. Importa un Excel para empezar.
            </p>
            <Link
              to="/datasets/import"
              className="text-g900 hover:text-g700 mt-1 inline-block text-[13px] font-semibold transition-colors"
            >
              Importar Excel
            </Link>
          </div>
        )}

        {datasets?.map((dataset, i) => (
          <button
            key={dataset.id}
            type="button"
            onClick={() => navigate(`/datasets/${dataset.id}`)}
            className={`hover:bg-g50 flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
              i < datasets.length - 1 ? 'border-g150 border-b' : ''
            }`}
          >
            <span className="bg-g100 text-g700 grid size-[34px] shrink-0 place-items-center rounded-[11px]">
              <SourceIcon source={dataset.source} />
            </span>
            <span className="min-w-0 grow">
              <span className="font-display text-g900 block truncate text-sm font-semibold">
                {dataset.name}
              </span>
              {dataset.description && (
                <span className="text-g500 block truncate text-[11.5px]">
                  {dataset.description}
                </span>
              )}
            </span>
            <span className="bg-g100 text-g600 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold">
              {sourceLabel[dataset.source]}
            </span>
            <span className="text-g400 w-16 shrink-0 text-right text-[11.5px]">
              {formatRows(dataset.row_count)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
