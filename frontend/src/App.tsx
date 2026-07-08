import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import { LoginPage } from '@/features/auth/pages/login-page'
import { RequireWorkspace } from '@/features/organizations/components/require-workspace'
import { SelectWorkspacePage } from '@/features/organizations/pages/select-workspace-page'
import { HomePage } from '@/pages/home-page'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/select-workspace" element={<SelectWorkspacePage />} />
          <Route element={<RequireWorkspace />}>
            <Route path="/" element={<HomePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
