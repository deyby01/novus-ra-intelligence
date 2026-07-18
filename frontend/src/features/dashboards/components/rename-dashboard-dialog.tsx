import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDashboardMutations } from '../hooks'

interface RenameDashboardDialogProps {
  id: string
  currentName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The rename form. Rendered only while the dialog is open, so it remounts on
 * each open — the field always starts fresh from the current name, no effect.
 */
function RenameForm({
  id,
  currentName,
  onDone,
}: {
  id: string
  currentName: string
  onDone: () => void
}) {
  const { update } = useDashboardMutations()
  const [name, setName] = useState(currentName)
  const trimmed = name.trim()

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!trimmed || update.isPending) return
    update.mutate({ id, name: trimmed }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={onSubmit} className="mt-1 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="rename-dashboard"
          className="text-g700 text-[13px] font-medium"
        >
          Nombre
        </label>
        <input
          id="rename-dashboard"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          className="border-g200 focus-visible:ring-g900 rounded-[10px] border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      {update.isError && (
        <p className="text-[12.5px] text-red-600">
          No pudimos renombrarlo. Intenta de nuevo.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="text-g600 hover:bg-g100 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!trimmed || update.isPending}
          className="bg-g900 font-display hover:bg-g800 inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors disabled:opacity-60"
        >
          {update.isPending && (
            <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
          )}
          Guardar
        </button>
      </div>
    </form>
  )
}

/** Controlled dialog that renames a dashboard via PATCH. */
export function RenameDashboardDialog({
  id,
  currentName,
  open,
  onOpenChange,
}: RenameDashboardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            Renombrar dashboard
          </DialogTitle>
        </DialogHeader>
        {open && (
          <RenameForm
            id={id}
            currentName={currentName}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
