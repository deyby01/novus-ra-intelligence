import { ArrowLeft, BarChart3, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AddWidgetModal } from '../components/add-widget-modal'
import { WidgetCard } from '../components/widget-card'
import { useDashboard, useDashboardMutations, useWidgets } from '../hooks'
import { sizeToColSpan } from '../utils'

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

  const [isConfirming, setIsConfirming] = useState(false)
  const [isAddingWidget, setIsAddingWidget] = useState(false)

  const handleDelete = () => {
    remove.mutate(dashboardId, {
      onSuccess: () => navigate('/dashboards'),
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/dashboards"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Dashboards
      </Link>

      {isPending && (
        <div className="space-y-4">
          <div className="bg-muted h-8 w-56 animate-pulse rounded-lg" />
          <div className="bg-muted h-64 animate-pulse rounded-xl" />
        </div>
      )}

      {!isPending && isError && (
        <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          We couldn&apos;t load this dashboard. Please try again.
        </p>
      )}

      {!isPending && !isError && dashboard && (
        <>
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {dashboard.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setIsAddingWidget(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add widget
              </Button>
              {isConfirming ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={remove.isPending}
                  >
                    Confirm Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsConfirming(false)}
                    disabled={remove.isPending}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsConfirming(true)}>
                  Delete dashboard
                </Button>
              )}
            </div>
          </header>

          {remove.isError && (
            <p className="text-destructive mb-4 text-sm">
              We couldn&apos;t delete the dashboard. Please try again.
            </p>
          )}

          {widgetsPending && (
            <div className="grid grid-cols-6 gap-4">
              {[0, 1].map((key) => (
                <div
                  key={key}
                  className="col-span-6 h-[300px] animate-pulse rounded-xl bg-muted sm:col-span-3"
                />
              ))}
            </div>
          )}

          {widgetsError && (
            <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
              We couldn&apos;t load the widgets. Please try again.
            </p>
          )}

          {widgets?.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
              <div className="bg-muted grid size-12 place-items-center rounded-xl border">
                <BarChart3 className="text-muted-foreground size-6" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">
                No widgets yet
              </h2>
              <p className="text-muted-foreground max-w-sm text-sm">
                Add widgets to visualize your data.
              </p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => setIsAddingWidget(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add widget
              </Button>
            </div>
          )}

          {widgets && widgets.length > 0 && (
            <div className="grid grid-cols-6 gap-6">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className={sizeToColSpan(widget.config.size)}
                >
                  <WidgetCard widget={widget} />
                </div>
              ))}
            </div>
          )}

          <AddWidgetModal
            dashboardId={dashboardId}
            isOpen={isAddingWidget}
            onClose={() => setIsAddingWidget(false)}
          />
        </>
      )}
    </div>
  )
}
