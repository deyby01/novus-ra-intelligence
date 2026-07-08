import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useMemberships } from '../hooks'
import { useWorkspaceStore } from '../store'

/** Header widget: shows the active workspace and a shortcut to switch it. */
export function WorkspaceIndicator() {
  const navigate = useNavigate()
  const currentOrganizationId = useWorkspaceStore(
    (state) => state.currentOrganizationId,
  )
  const { data: memberships } = useMemberships()
  const current = memberships?.find(
    (membership) => membership.organization.id === currentOrganizationId,
  )

  if (!current) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <span className="bg-foreground text-background grid size-6 place-items-center rounded text-xs font-semibold">
        {current.organization.name.charAt(0).toUpperCase()}
      </span>
      <span className="text-sm font-medium">{current.organization.name}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/select-workspace')}
      >
        Switch
      </Button>
    </div>
  )
}
