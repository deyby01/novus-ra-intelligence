import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import { server } from '@/test/server'
import { useAuthStore } from '../store'
import { LoginForm } from './login-form'

async function fillAndSubmit(email: string, password: string) {
  await userEvent.type(screen.getByLabelText(/email/i), email)
  await userEvent.type(screen.getByLabelText(/password/i), password)
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('LoginForm', () => {
  it('stores the tokens returned by a successful login', async () => {
    server.use(
      http.post('*/auth/login/', () =>
        HttpResponse.json({ access: 'access-token', refresh: 'refresh-token' }),
      ),
    )
    renderWithProviders(<LoginForm />)

    await fillAndSubmit('user@example.com', 'pass1234')

    await waitFor(() =>
      expect(useAuthStore.getState().accessToken).toBe('access-token'),
    )
  })

  it('shows an error when the credentials are rejected', async () => {
    server.use(
      http.post('*/auth/login/', () => new HttpResponse(null, { status: 401 })),
    )
    renderWithProviders(<LoginForm />)

    await fillAndSubmit('user@example.com', 'wrong-password')

    expect(
      await screen.findByText(/incorrect email or password/i),
    ).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('rejects an invalid email before calling the API', async () => {
    renderWithProviders(<LoginForm />)

    await fillAndSubmit('not-an-email', 'pass1234')

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument()
  })
})
