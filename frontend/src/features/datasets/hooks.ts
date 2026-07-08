import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import {
  createDataset,
  createImportJob,
  getDataset,
  getDatasetFields,
  getDatasetRows,
  getDatasets,
  getImportJob,
} from './api'
import type { ImportJob } from './types'

/**
 * Query the active workspace's datasets. Keyed by the organization id so
 * switching workspaces refetches instead of showing another tenant's cache.
 */
export function useDatasets() {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))
  const organizationId = useWorkspaceStore(
    (state) => state.currentOrganizationId,
  )
  return useQuery({
    queryKey: ['datasets', organizationId],
    queryFn: getDatasets,
    enabled: isAuthenticated && Boolean(organizationId),
  })
}

/** Whether a workspace-scoped query is allowed to run: authenticated + an org + a target. */
function useTenantQueryEnabled(id: string): boolean {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))
  const organizationId = useWorkspaceStore(
    (state) => state.currentOrganizationId,
  )
  return isAuthenticated && Boolean(organizationId) && Boolean(id)
}

function useOrganizationId(): string | null {
  return useWorkspaceStore((state) => state.currentOrganizationId)
}

/** Fetch a single dataset, keyed by the active organization. */
export function useDataset(id: string) {
  const organizationId = useOrganizationId()
  return useQuery({
    queryKey: ['dataset', organizationId, id],
    queryFn: () => getDataset(id),
    enabled: useTenantQueryEnabled(id),
  })
}

/** Fetch a dataset's column definitions, keyed by the active organization. */
export function useDatasetFields(id: string) {
  const organizationId = useOrganizationId()
  return useQuery({
    queryKey: ['dataset-fields', organizationId, id],
    queryFn: () => getDatasetFields(id),
    enabled: useTenantQueryEnabled(id),
  })
}

/** Fetch a dataset's rows, keyed by the active organization. */
export function useDatasetRows(id: string) {
  const organizationId = useOrganizationId()
  return useQuery({
    queryKey: ['dataset-rows', organizationId, id],
    queryFn: () => getDatasetRows(id),
    enabled: useTenantQueryEnabled(id),
  })
}

/** Create a dataset from an uploaded Excel file and return its import job. */
export function useImportExcel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      name,
      file,
    }: {
      name: string
      file: File
    }): Promise<ImportJob> => {
      const dataset = await createDataset({ name, source: 'excel' })
      return createImportJob(dataset.id, file)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
  })
}

/** Poll an import job until it finishes (done or error). */
export function useImportJob(id: string | null) {
  return useQuery({
    queryKey: ['import-job', id],
    queryFn: () => getImportJob(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'pending' || status === 'processing' ? 1500 : false
    },
  })
}
