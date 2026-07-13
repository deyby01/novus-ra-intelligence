import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import { server } from '@/test/server'
import { ResetPasswordForm } from './reset-password-form'

const { navigateMock, searchParamsMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  searchParamsMock: new URLSearchParams({ uid: 'abc123', token: 'tok456' }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [searchParamsMock],
  }
})

async function fillAndSubmit({
  password = 'NewSecure2026',
  confirm = 'NewSecure2026',
}: {
  password?: string
  confirm?: string
} = {}) {
  await userEvent.type(screen.getByLabelText(/new password/i), password)
  await userEvent.type(screen.getByLabelText(/confirm password/i), confirm)
  await userEvent.click(screen.getByRole('button', { name: /reset password/i }))
}

describe('ResetPasswordForm', () => {
  beforeEach(() => navigateMock.mockClear())

  it('submits and navigates to /login on success', async () => {
    server.use(
      http.post('*/auth/password/reset/confirm/', () =>
        HttpResponse.json(
          { detail: 'Your password has been reset. You can now sign in.' },
          { status: 200 },
        ),
      ),
    )
    renderWithProviders(<ResetPasswordForm />)

    await fillAndSubmit()

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/login', {
        state: { passwordReset: true },
      }),
    )
  })

  it('shows the invalid-link message on a 400 with a token error and does NOT navigate', async () => {
    server.use(
      http.post('*/auth/password/reset/confirm/', () =>
        HttpResponse.json(
          { token: ['The reset link is invalid or has expired.'] },
          { status: 400 },
        ),
      ),
    )
    renderWithProviders(<ResetPasswordForm />)

    await fillAndSubmit()

    expect(
      await screen.findByText(/the reset link is invalid or has expired/i),
    ).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('shows a password-policy error inline on a 400 with a new_password error', async () => {
    server.use(
      http.post('*/auth/password/reset/confirm/', () =>
        HttpResponse.json(
          { new_password: ['This password is too common.'] },
          { status: 400 },
        ),
      ),
    )
    renderWithProviders(<ResetPasswordForm />)

    await fillAndSubmit()

    expect(
      await screen.findByText(/this password is too common/i),
    ).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('blocks a password shorter than 8 characters before calling the API', async () => {
    const requestSpy = vi.fn()
    server.use(
      http.post('*/auth/password/reset/confirm/', () => {
        requestSpy()
        return new HttpResponse(null, { status: 200 })
      }),
    )
    renderWithProviders(<ResetPasswordForm />)

    await fillAndSubmit({ password: '123', confirm: '123' })

    expect(
      await screen.findByText(/at least 8 characters/i),
    ).toBeInTheDocument()
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('blocks mismatched password and confirm fields', async () => {
    const requestSpy = vi.fn()
    server.use(
      http.post('*/auth/password/reset/confirm/', () => {
        requestSpy()
        return new HttpResponse(null, { status: 200 })
      }),
    )
    renderWithProviders(<ResetPasswordForm />)

    await fillAndSubmit({ password: 'NewSecure2026', confirm: 'Different123' })

    expect(
      await screen.findByText(/passwords do not match/i),
    ).toBeInTheDocument()
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('shows the invalid-link state when uid or token is missing from the URL', async () => {
    // Override the mock to return empty params
    searchParamsMock.delete('uid')
    searchParamsMock.delete('token')

    renderWithProviders(<ResetPasswordForm />)

    expect(screen.getByTestId('invalid-link')).toBeInTheDocument()
    expect(screen.getByText(/request a new link/i)).toBeInTheDocument()

    // Restore for other tests
    searchParamsMock.set('uid', 'abc123')
    searchParamsMock.set('token', 'tok456')
  })
})
