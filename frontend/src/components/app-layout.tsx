import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { useLogout, useMe } from '@/features/auth/hooks'
import { WorkspaceIndicator } from '@/features/organizations/components/workspace-indicator'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Datasets', end: true },
  { to: '/dashboards', label: 'Dashboards', end: false },
]

/** Shell for authenticated, workspace-scoped pages: the top bar plus page content. */
export function AppLayout() {
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
        <div className="flex items-center gap-4">
          <Wordmark className="shrink-0" />
          <div className="bg-border hidden h-5 w-px sm:block" />
          <div className="hidden sm:block">
            <WorkspaceIndicator />
          </div>
          <nav className="flex items-center gap-1 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'hover:text-foreground rounded-md px-2 py-1 font-medium transition-colors',
                    isActive
                      ? 'text-foreground bg-muted'
                      : 'text-muted-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {user.email}
            </span>
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

      <main>
        <Outlet />
      </main>
    </div>
  )
}
