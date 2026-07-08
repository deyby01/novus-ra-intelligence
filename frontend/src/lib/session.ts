import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'

/**
 * Clear all client session state: auth tokens and the selected workspace. Used
 * on logout and when a token refresh fails, so a workspace can never leak from
 * one signed-in user to the next in the same browser.
 */
export function clearSession(): void {
  useAuthStore.getState().clear()
  useWorkspaceStore.getState().clear()
}
