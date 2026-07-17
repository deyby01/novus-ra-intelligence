import { Database, LayoutGrid, Loader2, MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDashboardMutations } from '../hooks'
import type { Dashboard } from '../types'
import { DashboardPreview } from './dashboard-preview'

const MONTHS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

/** "17 jul 2026" — hand-formatted so it doesn't depend on the runtime's ICU. */
function formatDate(iso: string): string {
  const date = new Date(iso)
  return `${date.getDate()} ${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`
}

/** A dashboard in the grid: a widget-type preview plus name, date, and meta. */
export function DashboardCard({ dashboard }: { dashboard: Dashboard }) {
  const { remove } = useDashboardMutations()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const to = `/dashboards/${dashboard.id}`
  const widgetCount = dashboard.widget_types.length
  const datasetCount = dashboard.dataset_ids.length

  return (
    <div className="border-g200 hover:border-g300 flex flex-col overflow-hidden rounded-[16px] border bg-white transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <Link to={to} aria-label={`Abrir ${dashboard.name}`}>
        <DashboardPreview widgetTypes={dashboard.widget_types} />
      </Link>

      <div className="flex grow flex-col gap-3 px-[17px] pb-4 pt-[15px]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={to}
              className="font-display text-g900 block truncate text-[17px] font-semibold tracking-[-0.01em] hover:underline"
            >
              {dashboard.name}
            </Link>
            <span className="text-g400 text-[11.5px]">
              Creado {formatDate(dashboard.created_at)}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Acciones del dashboard"
                className="bg-g100 text-g600 hover:bg-g150 grid size-7 shrink-0 place-items-center rounded-[9px] transition-colors"
              >
                <MoreVertical className="size-4" strokeWidth={1.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem disabled>Renombrar (pronto)</DropdownMenuItem>
              <DropdownMenuItem disabled>Duplicar (pronto)</DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setConfirmOpen(true)}
              >
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-auto flex items-center gap-3 text-[11.5px]">
          <span className="bg-g100 text-g600 inline-flex items-center gap-1.5 rounded-full px-[9px] py-[3px] font-semibold">
            <LayoutGrid className="size-[11px]" strokeWidth={1.5} />
            {widgetCount} {widgetCount === 1 ? 'widget' : 'widgets'}
          </span>
          <span className="text-g500 inline-flex items-center gap-1.5">
            <Database className="size-3" strokeWidth={1.5} />
            {datasetCount} {datasetCount === 1 ? 'dataset' : 'datasets'}
          </span>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              ¿Eliminar “{dashboard.name}”?
            </DialogTitle>
            <DialogDescription>
              Se eliminará el dashboard y sus widgets. Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          {remove.isError && (
            <p className="text-[12.5px] text-red-600">
              No pudimos eliminarlo. Intenta de nuevo.
            </p>
          )}
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="text-g600 hover:bg-g100 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(dashboard.id, {
                  onSuccess: () => setConfirmOpen(false),
                })
              }
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-red-600 px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {remove.isPending && (
                <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
              )}
              Eliminar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
