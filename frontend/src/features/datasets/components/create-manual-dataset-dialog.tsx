import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useCreateDataset } from '../hooks'

/** Header CTA + dialog to start an empty manual dataset (no file). */
export function CreateManualDatasetDialog() {
  const navigate = useNavigate()
  const create = useCreateDataset()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const trimmedName = name.trim()

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!trimmedName || create.isPending) return
    create.mutate(
      { name: trimmedName, description: description.trim() || undefined },
      {
        onSuccess: (dataset) => {
          setOpen(false)
          navigate(`/datasets/${dataset.id}`)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="border-g200 text-g700 font-display hover:bg-g100 inline-flex items-center gap-1.5 rounded-[12px] border bg-white px-[17px] py-[11px] text-[13.5px] font-semibold transition-colors"
        >
          <Plus className="size-4" strokeWidth={1.5} />
          Dataset manual
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            Nuevo dataset manual
          </DialogTitle>
          <DialogDescription>
            Crea un dataset vacío para llenarlo a mano. Podrás definir sus
            columnas y filas en el detalle.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="mt-1 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="dataset-name"
              className="text-g700 text-[13px] font-medium"
            >
              Nombre
            </label>
            <input
              id="dataset-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              placeholder="Ej. Cartera de clientes"
              className="border-g200 focus-visible:ring-g900 rounded-[10px] border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="dataset-description"
              className="text-g700 text-[13px] font-medium"
            >
              Descripción <span className="text-g400">(opcional)</span>
            </label>
            <textarea
              id="dataset-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="Para qué sirve este dataset — ayuda a la IA a interpretarlo."
              className="border-g200 focus-visible:ring-g900 resize-none rounded-[10px] border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2"
            />
          </div>

          {create.isError && (
            <p className="text-[12.5px] text-red-600">
              No pudimos crear el dataset. Intenta de nuevo.
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
              disabled={!trimmedName || create.isPending}
              className="bg-g900 font-display hover:bg-g800 inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors disabled:opacity-60"
            >
              {create.isPending && (
                <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
              )}
              Crear dataset
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
