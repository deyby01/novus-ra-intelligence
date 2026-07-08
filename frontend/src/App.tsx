import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/app-layout'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import { LoginPage } from '@/features/auth/pages/login-page'
import { DatasetsPage } from '@/features/datasets/pages/datasets-page'
import { ImportDatasetPage } from '@/features/datasets/pages/import-dataset-page'
import { RequireWorkspace } from '@/features/organizations/components/require-workspace'
import { SelectWorkspacePage } from '@/features/organizations/pages/select-workspace-page'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/select-workspace" element={<SelectWorkspacePage />} />
          <Route element={<RequireWorkspace />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DatasetsPage />} />
              <Route path="/datasets/import" element={<ImportDatasetPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
