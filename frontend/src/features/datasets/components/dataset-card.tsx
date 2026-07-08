import { FileSpreadsheet, PencilLine } from 'lucide-react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import type { Dataset } from '../types'

const sourceMeta: Record<
  Dataset['source'],
  { label: string; icon: ComponentType<{ className?: string }> }
> = {
  excel: { label: 'Excel', icon: FileSpreadsheet },
  manual: { label: 'Manual', icon: PencilLine },
}

/** A single dataset in the list: name, description, and where its rows came from. */
export function DatasetCard({ dataset }: { dataset: Dataset }) {
  const meta = sourceMeta[dataset.source]
  const SourceIcon = meta.icon

  return (
    <Link
      to={`/datasets/${dataset.id}`}
      className="hover:border-foreground/20 hover:bg-muted/40 focus-visible:ring-ring flex flex-col rounded-xl border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="truncate font-medium">{dataset.name}</h3>
        <span className="text-muted-foreground bg-muted flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
          <SourceIcon className="size-3" />
          {meta.label}
        </span>
      </div>
      <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
        {dataset.description || (
          <span className="italic opacity-70">No description</span>
        )}
      </p>
    </Link>
  )
}
