import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/app-layout'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import { LoginPage } from '@/features/auth/pages/login-page'
import { DashboardDetailPage } from '@/features/dashboards/pages/dashboard-detail-page'
import { DashboardsPage } from '@/features/dashboards/pages/dashboards-page'
import { DatasetDetailPage } from '@/features/datasets/pages/dataset-detail-page'
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
              <Route
                path="/datasets/:datasetId"
                element={<DatasetDetailPage />}
              />
              <Route path="/dashboards" element={<DashboardsPage />} />
              <Route
                path="/dashboards/:dashboardId"
                element={<DashboardDetailPage />}
              />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
