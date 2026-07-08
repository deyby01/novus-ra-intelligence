import { LayoutDashboard, Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DashboardCard } from '../components/dashboard-card'
import { useDashboardMutations, useDashboards } from '../hooks'

export function DashboardsPage() {
  const { data: dashboards, isPending, isError } = useDashboards()
  const { create } = useDashboardMutations()
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')

  const openForm = () => {
    setIsCreating(true)
    setName('')
    create.reset()
  }

  const closeForm = () => {
    setIsCreating(false)
    setName('')
    create.reset()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    create.mutate({ name: trimmed }, { onSuccess: closeForm })
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboards</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            The dashboards that visualize this workspace's data.
          </p>
        </div>
        <Button onClick={openForm} disabled={isCreating}>
          <Plus />
          New dashboard
        </Button>
      </header>

      {isCreating && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border p-5"
          aria-label="Create dashboard"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dashboard-name">Name</Label>
            <Input
              id="dashboard-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Revenue overview"
              autoFocus
              disabled={create.isPending}
            />
          </div>
          {create.isError && (
            <p className="text-destructive mt-3 text-sm">
              We couldn&apos;t create the dashboard. Please try again.
            </p>
          )}
          <div className="mt-4 flex items-center gap-2">
            <Button
              type="submit"
              disabled={create.isPending || name.trim().length === 0}
            >
              Create
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeForm}
              disabled={create.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="bg-muted h-28 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          We couldn&apos;t load your dashboards. Please try again.
        </p>
      )}

      {dashboards?.length === 0 && !isCreating && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <div className="bg-muted grid size-12 place-items-center rounded-xl border">
            <LayoutDashboard className="text-muted-foreground size-6" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">
            No dashboards yet
          </h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            Create a dashboard to bring your datasets together into charts and
            reports.
          </p>
          <Button onClick={openForm} className="mt-2">
            <Plus />
            New dashboard
          </Button>
        </div>
      )}

      {dashboards && dashboards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((dashboard) => (
            <DashboardCard key={dashboard.id} dashboard={dashboard} />
          ))}
        </div>
      )}
    </div>
  )
}
