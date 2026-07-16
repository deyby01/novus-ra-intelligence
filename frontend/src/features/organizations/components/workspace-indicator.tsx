import { ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
    <button
      type="button"
      onClick={() => navigate('/select-workspace')}
      title="Switch workspace"
      className="hover:bg-g100 flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors"
    >
      <span className="bg-g100 text-g900 font-display grid size-[22px] place-items-center rounded-[7px] text-[11px] font-semibold">
        {current.organization.name.charAt(0).toUpperCase()}
      </span>
      <span className="text-g900 text-[13px] font-semibold">
        {current.organization.name}
      </span>
      <ChevronDown className="text-g400 size-3.5" strokeWidth={1.5} />
    </button>
  )
}
