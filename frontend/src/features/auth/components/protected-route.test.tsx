import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useAuthStore } from '../store'
import { ProtectedRoute } from './protected-route'

function renderRoutes() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Protected home</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects to the login page when unauthenticated', () => {
    useAuthStore.getState().clear()

    renderRoutes()

    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders the protected content when authenticated', () => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })

    renderRoutes()

    expect(screen.getByText('Protected home')).toBeInTheDocument()
  })
})
