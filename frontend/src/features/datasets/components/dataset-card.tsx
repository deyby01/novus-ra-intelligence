import {
  ArrowRight,
  Columns3,
  FileSpreadsheet,
  Pencil,
  Rows3,
  Sparkles,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { formatNumber } from '@/features/home/utils'
import type { Dataset } from '../types'

const sourceMeta: Record<
  Dataset['source'],
  {
    label: string
    icon: ComponentType<{ className?: string; strokeWidth?: number }>
  }
> = {
  excel: { label: 'Excel', icon: FileSpreadsheet },
  manual: { label: 'Manual', icon: Pencil },
}

/** A dataset in the grid: type, name, description, size, and AI actions. */
export function DatasetCard({ dataset }: { dataset: Dataset }) {
  const meta = sourceMeta[dataset.source]
  const SourceIcon = meta.icon
  const to = `/datasets/${dataset.id}`

  return (
    <div className="border-g200 hover:border-g300 flex flex-col gap-[13px] rounded-[16px] border bg-white px-[19px] py-[18px] transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      {/* Type icon + badge */}
      <div className="flex items-start justify-between">
        <span className="bg-g100 text-g700 grid size-10 shrink-0 place-items-center rounded-[12px]">
          <SourceIcon className="size-[19px]" strokeWidth={1.5} />
        </span>
        <span className="border-g200 bg-g100 text-g600 inline-flex items-center gap-1 rounded-full border px-[10px] py-1 text-[11px] font-semibold">
          <SourceIcon className="size-[11px]" strokeWidth={1.5} />
          {meta.label}
        </span>
      </div>

      {/* Name + description */}
      <div>
        <Link
          to={to}
          className="font-display text-g900 block truncate text-[17px] font-semibold tracking-[-0.01em] hover:underline"
        >
          {dataset.name}
        </Link>
        <p
          className={`mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed ${
            dataset.description ? 'text-g500' : 'text-g400 italic'
          }`}
        >
          {dataset.description ||
            'Sin descripción — añade uno para que la IA lo interprete mejor.'}
        </p>
      </div>

      {/* Size meta */}
      <div className="text-g400 flex items-center gap-[14px] text-[11.5px]">
        <span className="inline-flex items-center gap-1.5">
          <Rows3 className="size-[13px]" strokeWidth={1.5} />
          {formatNumber(dataset.row_count)} filas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Columns3 className="size-[13px]" strokeWidth={1.5} />
          {formatNumber(dataset.field_count)} cols
        </span>
      </div>

      {/* Actions — pinned to the bottom */}
      <div className="border-g150 mt-auto flex items-center gap-2 border-t pt-3">
        <Link
          to={to}
          className="bg-g900 font-display hover:bg-g800 flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2 text-[12.5px] font-semibold text-white transition-colors"
        >
          <Sparkles className="size-[14px]" strokeWidth={1.5} />
          Overview IA
        </Link>
        <Link
          to={to}
          aria-label={`Abrir ${dataset.name}`}
          className="border-g200 bg-g100 text-g600 hover:bg-g150 grid size-9 shrink-0 place-items-center rounded-[10px] border transition-colors"
        >
          <ArrowRight className="size-4" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  )
}
