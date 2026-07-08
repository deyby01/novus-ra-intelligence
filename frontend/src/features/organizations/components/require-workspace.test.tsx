import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore } from '../store'
import { RequireWorkspace } from './require-workspace'

function renderRoutes() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<RequireWorkspace />}>
          <Route path="/" element={<div>Workspace home</div>} />
        </Route>
        <Route path="/select-workspace" element={<div>Select workspace</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireWorkspace', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().clear()
  })

  it('redirects to workspace selection when none is chosen', () => {
    renderRoutes()

    expect(screen.getByText('Select workspace')).toBeInTheDocument()
  })

  it('renders the content when a workspace is chosen', () => {
    useWorkspaceStore.getState().setCurrentOrganization('org-1')

    renderRoutes()

    expect(screen.getByText('Workspace home')).toBeInTheDocument()
  })
})
