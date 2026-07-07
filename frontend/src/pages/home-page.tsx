import { FileSpreadsheet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { useLogout, useMe } from '@/features/auth/hooks'

export function HomePage() {
  const navigate = useNavigate()
  const { data: user } = useMe()
  const { mutate: logout, isPending } = useLogout()

  const onLogout = () => {
    logout(undefined, {
      onSettled: () => navigate('/login', { replace: true }),
    })
  }

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Wordmark />
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-muted-foreground text-sm">{user.email}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            disabled={isPending}
          >
            Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-24 text-center">
        <div className="bg-muted grid size-12 place-items-center rounded-xl border">
          <FileSpreadsheet className="text-muted-foreground size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          No datasets yet
        </h1>
        <p className="text-muted-foreground max-w-md">
          Import an Excel file to turn it into a live dataset, then build
          dashboards and AI reports on top of it.
        </p>
        <Button className="mt-2" disabled>
          Import a spreadsheet
        </Button>
      </main>
    </div>
  )
}
