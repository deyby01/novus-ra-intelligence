import { Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

/**
 * Wraps a trigger for the "generate a dashboard with AI" flow. The flow itself
 * is still being designed, so this sets expectations honestly instead of
 * pretending to build one.
 */
export function GenerateWithAiDialog({ children }: { children: ReactNode }) {
  return (
    <Dialog>
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
            Pronto podrás elegir un dataset y dejar que la IA proponga los
            widgets del dashboard. Estamos afinando cómo funcionará — por ahora
            crea uno en blanco y añade tus widgets en el editor.
          </DialogDescription>
        </DialogHeader>
        <span className="bg-g100 text-g600 mt-1 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold">
          <Sparkles className="size-3.5" strokeWidth={1.5} />
          Próximamente
        </span>
      </DialogContent>
    </Dialog>
  )
}
