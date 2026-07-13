import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import { server } from '@/test/server'
import { ForgotPasswordForm } from './forgot-password-form'

describe('ForgotPasswordForm', () => {
  it('shows a neutral confirmation after a valid email submission', async () => {
    server.use(
      http.post(
        '*/auth/password/reset/',
        () => new HttpResponse(null, { status: 200 }),
      ),
    )
    renderWithProviders(<ForgotPasswordForm />)

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.click(
      screen.getByRole('button', { name: /send reset link/i }),
    )

    expect(
      await screen.findByText(/if that email is registered/i),
    ).toBeInTheDocument()
  })

  it('rejects an invalid email before calling the API', async () => {
    const requestSpy = vi.fn()
    server.use(
      http.post('*/auth/password/reset/', () => {
        requestSpy()
        return new HttpResponse(null, { status: 200 })
      }),
    )
    renderWithProviders(<ForgotPasswordForm />)

    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
    await userEvent.click(
      screen.getByRole('button', { name: /send reset link/i }),
    )

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument()
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('shows a throttle message on a 429', async () => {
    server.use(
      http.post(
        '*/auth/password/reset/',
        () => new HttpResponse(null, { status: 429 }),
      ),
    )
    renderWithProviders(<ForgotPasswordForm />)

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.click(
      screen.getByRole('button', { name: /send reset link/i }),
    )

    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument()
  })
})
