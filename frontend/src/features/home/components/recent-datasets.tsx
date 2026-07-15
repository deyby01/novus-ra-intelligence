import { FileSpreadsheet, Pencil, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

interface DatasetRow {
  name: string
  description: string
  type: 'Excel' | 'Manual'
  rows: string
  icon: LucideIcon
}

// Sample data (README) — swap for `useDatasets()` rows once wired.
const datasets: DatasetRow[] = [
  {
    name: 'Ventas Q3',
    description: 'Cifras mensuales de finanzas',
    type: 'Excel',
    rows: '1.662 filas',
    icon: FileSpreadsheet,
  },
  {
    name: 'Inventario Bodega',
    description: 'SKUs, stock y reorden',
    type: 'Excel',
    rows: '1.284 filas',
    icon: FileSpreadsheet,
  },
  {
    name: 'Leads Web',
    description: 'Prospectos del formulario',
    type: 'Manual',
    rows: '318 filas',
    icon: Pencil,
  },
  {
    name: 'Cobranza Cartera',
    description: 'Facturas y días de mora',
    type: 'Excel',
    rows: '742 filas',
    icon: FileSpreadsheet,
  },
]

/** Block 6 — recent datasets list in a single bordered panel. */
export function RecentDatasets() {
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
        {datasets.map((dataset, i) => (
          <button
            key={dataset.name}
            type="button"
            className={`hover:bg-g50 flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
              i < datasets.length - 1 ? 'border-g150 border-b' : ''
            }`}
          >
            <span className="bg-g100 text-g700 grid size-[34px] shrink-0 place-items-center rounded-[11px]">
              <dataset.icon className="size-[17px]" strokeWidth={1.5} />
            </span>
            <span className="min-w-0 grow">
              <span className="font-display text-g900 block truncate text-sm font-semibold">
                {dataset.name}
              </span>
              <span className="text-g500 block truncate text-[11.5px]">
                {dataset.description}
              </span>
            </span>
            <span className="bg-g100 text-g600 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold">
              {dataset.type}
            </span>
            <span className="text-g400 w-16 shrink-0 text-right text-[11.5px]">
              {dataset.rows}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
