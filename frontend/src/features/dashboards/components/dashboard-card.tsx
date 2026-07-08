import { LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Dashboard } from '../types'

/** A single dashboard in the list: name plus the date it was created. */
export function DashboardCard({ dashboard }: { dashboard: Dashboard }) {
  const created = new Date(dashboard.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Link
      to={`/dashboards/${dashboard.id}`}
      className="hover:border-foreground/20 hover:bg-muted/40 focus-visible:ring-ring flex flex-col rounded-xl border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="truncate font-medium">{dashboard.name}</h3>
        <span className="text-muted-foreground bg-muted flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
          <LayoutDashboard className="size-3" />
          Dashboard
        </span>
      </div>
      <p className="text-muted-foreground mt-2 text-sm">Created {created}</p>
    </Link>
  )
}
