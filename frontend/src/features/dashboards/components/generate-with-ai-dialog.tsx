import { Database, Loader2, Sparkles, Upload } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useDatasets } from '@/features/datasets/hooks'
import { formatNumber } from '@/features/home/utils'
import { useGenerateDashboard } from '../hooks'

/**
 * The "generate a dashboard with AI" flow: pick a dataset, and the AI builds a
 * dashboard from it (deterministic widgets + an AI name/summary) and opens it.
 */
export function GenerateWithAiDialog({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { data: datasets, isPending: datasetsPending } = useDatasets()
  const generate = useGenerateDashboard()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const onGenerate = () => {
    if (!selectedId || generate.isPending) return
    generate.mutate(selectedId, {
      onSuccess: (dashboard) => {
        setOpen(false)
        navigate(`/dashboards/${dashboard.id}`)
      },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setSelectedId(null)
          generate.reset()
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="bg-g900 mb-1 grid size-11 place-items-center rounded-[13px] text-white">
            <Sparkles className="size-5" strokeWidth={1.5} />
          </div>
          <DialogTitle className="font-display">
            Generar un dashboard con IA
          </DialogTitle>
          <DialogDescription>
            Elige un dataset y la IA arma un dashboard con sus KPIs y gráficos.
          </DialogDescription>
        </DialogHeader>

        {/* Empty workspace — nothing to generate from */}
        {!datasetsPending && datasets?.length === 0 && (
          <div className="border-g200 flex flex-col items-center gap-2 rounded-[14px] border bg-white px-4 py-8 text-center">
            <span className="bg-g100 text-g600 grid size-11 place-items-center rounded-[13px]">
              <Database className="size-5" strokeWidth={1.5} />
            </span>
            <p className="text-g500 text-[13px]">
              Importa un dataset primero para que la IA tenga con qué trabajar.
            </p>
            <Link
              to="/datasets/import"
              onClick={() => setOpen(false)}
              className="bg-g900 font-display hover:bg-g800 mt-1 inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[13px] font-semibold text-white transition-colors"
            >
              <Upload className="size-4" strokeWidth={1.5} />
              Importar Excel
            </Link>
          </div>
        )}

        {/* Dataset picker */}
        {datasets && datasets.length > 0 && (
          <>
            <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
              {datasets.map((dataset) => {
                const selected = dataset.id === selectedId
                return (
                  <button
                    key={dataset.id}
                    type="button"
                    onClick={() => setSelectedId(dataset.id)}
                    className={`flex items-center justify-between gap-3 rounded-[11px] border px-3.5 py-2.5 text-left transition-colors ${
                      selected
                        ? 'border-g900 bg-g50'
                        : 'border-g200 hover:bg-g50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="font-display text-g900 block truncate text-[13.5px] font-semibold">
                        {dataset.name}
                      </span>
                      <span className="text-g400 text-[11.5px]">
                        {formatNumber(dataset.row_count)} filas ·{' '}
                        {formatNumber(dataset.field_count)} cols
                      </span>
                    </span>
                    <span
                      className={`size-4 shrink-0 rounded-full border-2 ${
                        selected ? 'border-g900 bg-g900' : 'border-g300'
                      }`}
                    />
                  </button>
                )
              })}
            </div>

            {generate.isError && (
              <p className="text-[12.5px] text-red-600">
                No pudimos generar el dashboard. Intenta de nuevo.
              </p>
            )}

            <button
              type="button"
              onClick={onGenerate}
              disabled={!selectedId || generate.isPending}
              className="bg-g900 font-display hover:bg-g800 inline-flex items-center justify-center gap-2 rounded-[12px] py-3 text-[13.5px] font-semibold text-white transition-colors disabled:opacity-60"
            >
              {generate.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
                  La IA está armando tu dashboard…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" strokeWidth={1.5} />
                  Generar dashboard
                </>
              )}
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
