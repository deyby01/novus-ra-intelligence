import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store'

/** Gate for authenticated routes: redirect to the login page when signed out. */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
