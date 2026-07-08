import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceState {
  currentOrganizationId: string | null
  setCurrentOrganization: (id: string) => void
  clear: () => void
}

/**
 * Workspace store. Holds the organization the user is currently acting in; the
 * API client reads it to send the `X-Organization` header. Persisted so the
 * chosen workspace survives a reload.
 */
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentOrganizationId: null,
      setCurrentOrganization: (id) => set({ currentOrganizationId: id }),
      clear: () => set({ currentOrganizationId: null }),
    }),
    { name: 'novus-workspace' },
  ),
)
