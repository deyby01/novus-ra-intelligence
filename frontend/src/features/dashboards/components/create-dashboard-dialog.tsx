import { Loader2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useDashboardMutations } from '../hooks'

/** Wraps a trigger; names a blank dashboard, creates it, and opens the editor. */
export function CreateDashboardDialog({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { create } = useDashboardMutations()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  const trimmed = name.trim()

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!trimmed || create.isPending) return
    create.mutate(
      { name: trimmed },
      {
        onSuccess: (dashboard) => {
          setOpen(false)
          navigate(`/dashboards/${dashboard.id}`)
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setName('')
          create.reset()
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Nuevo dashboard</DialogTitle>
          <DialogDescription>
            Empieza en blanco. Podrás añadirle widgets en el editor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="mt-1 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="dashboard-name"
              className="text-g700 text-[13px] font-medium"
            >
              Nombre
            </label>
            <input
              id="dashboard-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              placeholder="Ej. Panel de ventas"
              className="border-g200 focus-visible:ring-g900 rounded-[10px] border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2"
            />
          </div>

          {create.isError && (
            <p className="text-[12.5px] text-red-600">
              No pudimos crear el dashboard. Intenta de nuevo.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-g600 hover:bg-g100 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!trimmed || create.isPending}
              className="bg-g900 font-display hover:bg-g800 inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors disabled:opacity-60"
            >
              {create.isPending && (
                <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
              )}
              Crear dashboard
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
