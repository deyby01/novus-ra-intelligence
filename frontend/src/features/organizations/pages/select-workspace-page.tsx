import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/brand'
import { useMemberships } from '../hooks'
import { useWorkspaceStore } from '../store'
import type { Membership } from '../types'

const gridMotif = {
  backgroundImage:
    'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
  backgroundSize: '34px 34px',
}

const roleLabels: Record<Membership['role'], string> = {
  admin: 'Admin',
  manager: 'Manager',
  operator: 'Operator',
}

export function SelectWorkspacePage() {
  const navigate = useNavigate()
  const setCurrentOrganization = useWorkspaceStore(
    (state) => state.setCurrentOrganization,
  )
  const { data: memberships, isPending, isError } = useMemberships()

  const choose = (membership: Membership) => {
    setCurrentOrganization(membership.organization.id)
    navigate('/', { replace: true })
  }

  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden p-6">
      <div
        aria-hidden
        className="text-foreground pointer-events-none absolute inset-0 opacity-[0.04]"
        style={gridMotif}
      />
      <div className="relative w-full max-w-md">
        <Wordmark className="mb-8 justify-center" />
        <h1 className="text-center text-2xl font-semibold tracking-tight">
          Choose a workspace
        </h1>
        <p className="text-muted-foreground mt-2 text-center text-sm">
          Pick the organization you want to work in.
        </p>

        <div className="mt-8 space-y-2">
          {isPending &&
            [0, 1].map((key) => (
              <div
                key={key}
                className="bg-muted h-16 animate-pulse rounded-lg"
              />
            ))}

          {isError && (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              We couldn&apos;t load your workspaces. Please try again.
            </p>
          )}

          {memberships?.length === 0 && (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              You don&apos;t belong to any workspace yet. Ask an administrator
              to invite you.
            </p>
          )}

          {memberships?.map((membership) => (
            <button
              key={membership.id}
              type="button"
              onClick={() => choose(membership)}
              className="hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="bg-foreground text-background grid size-10 shrink-0 place-items-center rounded-md text-sm font-semibold">
                {membership.organization.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 grow">
                <span className="block truncate font-medium">
                  {membership.organization.name}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  /{membership.organization.slug}
                </span>
              </span>
              <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs font-medium">
                {roleLabels[membership.role] ?? membership.role}
              </span>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
