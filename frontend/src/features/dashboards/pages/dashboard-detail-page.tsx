import {
  ArrowLeft,
  LayoutGrid,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { AddWidgetModal } from '../components/add-widget-modal'
import { RenameDashboardDialog } from '../components/rename-dashboard-dialog'
import { WidgetCard } from '../components/widget-card'
import { useDashboard, useDashboardMutations, useWidgets } from '../hooks'
import { relativeTime, sizeToColSpan } from '../utils'

/** A dashed tile inviting the user to add a widget. */
function AddWidgetTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-g300 hover:border-g400 hover:bg-g50 flex w-full items-center justify-center gap-3 rounded-2xl border-[1.5px] border-dashed bg-white p-4 transition-colors"
    >
      <span className="bg-g100 text-g700 grid size-[34px] place-items-center rounded-[10px]">
        <Plus className="size-[17px]" strokeWidth={1.5} />
      </span>
      <span className="font-display text-g900 text-[14px] font-semibold">
        Añadir widget
      </span>
      <span className="text-g500 hidden text-[12px] sm:inline">
        gráfico, KPI o tabla de un dataset
      </span>
    </button>
  )
}

export function DashboardDetailPage() {
  const { dashboardId = '' } = useParams<{ dashboardId: string }>()
  const navigate = useNavigate()
  const { data: dashboard, isPending, isError } = useDashboard(dashboardId)
  const { remove } = useDashboardMutations()
  const {
    data: widgets,
    isPending: widgetsPending,
    isError: widgetsError,
  } = useWidgets(dashboardId)

  const [isAddingWidget, setIsAddingWidget] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const handleDelete = () => {
    remove.mutate(dashboardId, { onSuccess: () => navigate('/dashboards') })
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-7 pb-[34px] pt-[22px]">
      <Link
        to="/dashboards"
        className="text-g500 hover:text-g700 inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-colors"
      >
        <ArrowLeft className="size-[15px]" strokeWidth={1.5} />
        Dashboards
      </Link>

      {isPending && (
        <div className="flex flex-col gap-4">
          <div className="bg-g100 h-8 w-56 animate-pulse rounded-lg" />
          <div className="bg-g100 h-64 animate-pulse rounded-2xl" />
        </div>
      )}

      {!isPending && isError && (
        <p className="border-g200 text-g500 rounded-2xl border border-dashed p-10 text-center text-sm">
          No pudimos cargar este dashboard. Intenta de nuevo.
        </p>
      )}

      {!isPending && !isError && dashboard && (
        <>
          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="font-display text-g900 truncate text-[20px] font-semibold tracking-[-0.02em]">
                {dashboard.name}
              </h1>
              <button
                type="button"
                aria-label="Renombrar dashboard"
                onClick={() => setRenameOpen(true)}
                className="text-g400 hover:bg-g100 hover:text-g600 grid size-7 shrink-0 place-items-center rounded-lg transition-colors"
              >
                <Pencil className="size-[14px]" strokeWidth={1.5} />
              </button>
              <span className="text-g400 text-[11.5px]">
                Actualizado {relativeTime(dashboard.updated_at)}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddingWidget(true)}
                className="bg-g900 font-display hover:bg-g800 inline-flex items-center gap-1.5 rounded-[11px] px-[15px] py-[9px] text-[12.5px] font-semibold text-white transition-colors"
              >
                <Plus className="size-[14px]" strokeWidth={1.5} />
                Añadir widget
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Acciones del dashboard"
                    className="bg-g100 text-g600 hover:bg-g150 grid size-9 shrink-0 place-items-center rounded-[11px] transition-colors"
                  >
                    <MoreVertical className="size-4" strokeWidth={1.5} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                    Renombrar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setConfirmDeleteOpen(true)}
                  >
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* AI insight — only when the AI wrote a summary for this dashboard */}
          {dashboard.description && (
            <section className="bg-g950 relative overflow-hidden rounded-2xl p-5 text-white sm:p-[21px]">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-100"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, rgba(255,255,255,.06) 1px, transparent 0)',
                  backgroundSize: '20px 20px',
                }}
              />
              <div className="relative">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className="grid size-[26px] place-items-center rounded-lg border border-white/20 bg-white/10">
                    <Sparkles className="size-[14px]" strokeWidth={1.5} />
                  </span>
                  <span className="font-display text-[13px] font-semibold">
                    Insight de la IA
                  </span>
                  <span className="text-g400 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.04em]">
                    AUTO
                  </span>
                </div>
                <p className="max-w-3xl text-[13.5px] leading-relaxed text-white/90">
                  {dashboard.description}
                </p>
              </div>
            </section>
          )}

          {/* Widgets */}
          {widgetsPending && (
            <div className="grid grid-cols-6 gap-4">
              {[0, 1].map((key) => (
                <div
                  key={key}
                  className="bg-g100 col-span-6 h-[300px] animate-pulse rounded-2xl sm:col-span-3"
                />
              ))}
            </div>
          )}

          {widgetsError && (
            <p className="border-g200 text-g500 rounded-2xl border border-dashed p-10 text-center text-sm">
              No pudimos cargar los widgets. Intenta de nuevo.
            </p>
          )}

          {widgets && widgets.length === 0 && (
            <div className="border-g300 flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed bg-white px-6 py-16 text-center">
              <span className="bg-g100 text-g600 grid size-12 place-items-center rounded-[13px]">
                <LayoutGrid className="size-6" strokeWidth={1.5} />
              </span>
              <h2 className="font-display text-g900 text-lg font-semibold tracking-tight">
                Aún no hay widgets
              </h2>
              <p className="text-g500 max-w-sm text-sm">
                Añade widgets para visualizar los datos de este workspace.
              </p>
              <button
                type="button"
                onClick={() => setIsAddingWidget(true)}
                className="bg-g900 font-display hover:bg-g800 mt-1 inline-flex items-center gap-1.5 rounded-[11px] px-4 py-2 text-[13px] font-semibold text-white transition-colors"
              >
                <Plus className="size-4" strokeWidth={1.5} />
                Añadir widget
              </button>
            </div>
          )}

          {widgets && widgets.length > 0 && (
            <div className="grid grid-cols-6 gap-4">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className={sizeToColSpan(widget.config.size)}
                >
                  <WidgetCard widget={widget} />
                </div>
              ))}
              <div className="col-span-6">
                <AddWidgetTile onClick={() => setIsAddingWidget(true)} />
              </div>
            </div>
          )}

          <AddWidgetModal
            dashboardId={dashboardId}
            isOpen={isAddingWidget}
            onClose={() => setIsAddingWidget(false)}
          />
          <RenameDashboardDialog
            id={dashboardId}
            currentName={dashboard.name}
            open={renameOpen}
            onOpenChange={setRenameOpen}
          />
          <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-display">
                  ¿Eliminar “{dashboard.name}”?
                </DialogTitle>
                <DialogDescription>
                  Se eliminará el dashboard y sus widgets. Esta acción no se
                  puede deshacer.
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
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="text-g600 hover:bg-g100 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 rounded-[10px] bg-red-600 px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                >
                  {remove.isPending && (
                    <Loader2
                      className="size-4 animate-spin"
                      strokeWidth={1.5}
                    />
                  )}
                  Eliminar
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
