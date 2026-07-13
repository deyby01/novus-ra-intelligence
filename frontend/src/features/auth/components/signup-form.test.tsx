import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkspaceStore } from '@/features/organizations/store'
import { renderWithProviders } from '@/test/utils'
import { server } from '@/test/server'
import { useAuthStore } from '../store'
import { SignupForm } from './signup-form'

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

const registerResponse = {
  user: { id: 'user-1', email: 'founder@acme.com' },
  organization: { id: 'org-42', name: 'Acme Inc.', slug: 'acme-inc' },
  access: 'access-token',
  refresh: 'refresh-token',
}

async function fillAndSubmit({
  org = 'Acme Inc.',
  email = 'founder@acme.com',
  password = 'SecurePass2026',
}: {
  org?: string
  email?: string
  password?: string
} = {}) {
  await userEvent.type(screen.getByLabelText(/company or team name/i), org)
  await userEvent.type(screen.getByLabelText(/email/i), email)
  await userEvent.type(screen.getByLabelText(/password/i), password)
  await userEvent.click(
    screen.getByRole('button', { name: /create workspace/i }),
  )
}

describe('SignupForm', () => {
  beforeEach(() => navigateMock.mockClear())

  it('stores tokens, activates the new workspace, and lands on home', async () => {
    server.use(
      http.post('*/auth/register/', () => HttpResponse.json(registerResponse)),
    )
    renderWithProviders(<SignupForm />)

    await fillAndSubmit()

    await waitFor(() =>
      expect(useAuthStore.getState().accessToken).toBe('access-token'),
    )
    // Load-bearing: the brand-new org is auto-selected so the picker is skipped.
    expect(useWorkspaceStore.getState().currentOrganizationId).toBe('org-42')
    expect(navigateMock).toHaveBeenCalledWith('/')
  })

  it('surfaces the field error from a 400 and does not navigate', async () => {
    server.use(
      http.post('*/auth/register/', () =>
        HttpResponse.json(
          { email: ['A user with this email already exists.'] },
          { status: 400 },
        ),
      ),
    )
    renderWithProviders(<SignupForm />)

    await fillAndSubmit({ email: 'taken@acme.com' })

    expect(
      await screen.findByText(/a user with this email already exists/i),
    ).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('blocks a password shorter than 8 characters before calling the API', async () => {
    const requestSpy = vi.fn()
    server.use(
      http.post('*/auth/register/', () => {
        requestSpy()
        return HttpResponse.json(registerResponse)
      }),
    )
    renderWithProviders(<SignupForm />)

    await fillAndSubmit({ password: '123' })

    expect(
      await screen.findByText(/at least 8 characters/i),
    ).toBeInTheDocument()
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('shows a throttle message on a 429', async () => {
    server.use(
      http.post(
        '*/auth/register/',
        () => new HttpResponse(null, { status: 429 }),
      ),
    )
    renderWithProviders(<SignupForm />)

    await fillAndSubmit()

    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
