import { Clock } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout, useMe } from '@/features/auth/hooks'
import { WorkspaceIndicator } from '@/features/organizations/components/workspace-indicator'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/datasets', label: 'Datasets', end: false },
  { to: '/dashboards', label: 'Dashboards', end: false },
]

function initialsFromEmail(email: string): string {
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

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
    <div className="bg-g100 min-h-svh">
      <header className="border-g200 flex items-center justify-between border-b bg-white px-7 py-3.5">
        <div className="flex items-center gap-3.5">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <span className="bg-g900 font-display grid size-7 place-items-center rounded-[9px] text-[15px] font-semibold text-white">
              N
            </span>
            <span className="font-display text-g900 text-[18px] font-semibold tracking-[-0.02em]">
              Novus RA
            </span>
          </div>

          <div className="bg-g200 h-5 w-px" />

          <div className="hidden sm:block">
            <WorkspaceIndicator />
          </div>

          <nav className="ml-1 flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3.5 py-1.5 text-[13px] transition-colors',
                    isActive
                      ? 'bg-g900 font-semibold text-white'
                      : 'text-g500 hover:bg-g100 font-medium',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            title="Recent activity"
            className="border-g200 bg-g100 text-g600 hover:bg-g150 grid size-[34px] place-items-center rounded-full border transition-colors"
          >
            <Clock className="size-4" strokeWidth={1.5} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="bg-g900 font-display grid size-[34px] place-items-center rounded-full text-[13px] font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-g900 focus-visible:ring-offset-2"
              >
                {user ? initialsFromEmail(user.email) : '·'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user && (
                <div className="text-g500 px-2 py-1.5 text-xs">
                  {user.email}
                </div>
              )}
              <DropdownMenuItem onClick={onLogout} disabled={isPending}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}
