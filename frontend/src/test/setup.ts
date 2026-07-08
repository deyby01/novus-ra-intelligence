import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useWorkspaceStore } from '@/features/organizations/store'
import { server } from './server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  server.resetHandlers()
  useAuthStore.getState().clear()
  useWorkspaceStore.getState().clear()
  localStorage.clear()
})

afterAll(() => server.close())
