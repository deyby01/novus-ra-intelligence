import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, type InitialEntry } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LoginPage } from './login-page'

function renderAt(entry: InitialEntry) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  it('shows a success banner when arriving from a completed password reset', () => {
    renderAt({ pathname: '/login', state: { passwordReset: true } })

    expect(screen.getByRole('status')).toHaveTextContent(/password reset/i)
  })

  it('shows no banner on a normal visit', () => {
    renderAt('/login')

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
