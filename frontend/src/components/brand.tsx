import { cn } from '@/lib/utils'

interface WordmarkProps {
  className?: string
  tone?: 'light' | 'dark'
}

/** The Novus RA wordmark: a spreadsheet-cell mark plus the product name. */
export function Wordmark({ className, tone = 'light' }: WordmarkProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'grid size-7 place-items-center rounded-md text-sm font-bold',
          tone === 'dark'
            ? 'bg-background text-foreground'
            : 'bg-foreground text-background',
        )}
      >
        N
      </span>
      <span className="text-lg font-semibold tracking-tight">
        Novus <span className="font-normal opacity-60">RA</span>
      </span>
    </div>
  )
}
