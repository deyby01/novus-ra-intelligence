import { Navigate, Outlet } from 'react-router-dom'
import { useWorkspaceStore } from '../store'

/** Gate for org-scoped routes: send the user to pick a workspace if none is set. */
export function RequireWorkspace() {
  const hasWorkspace = useWorkspaceStore((state) =>
    Boolean(state.currentOrganizationId),
  )
  return hasWorkspace ? <Outlet /> : <Navigate to="/select-workspace" replace />
}
