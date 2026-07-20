import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import { SettingsPage } from './settings-page'

const USER = { id: 'u1', email: 'admin@novusra.com', name: 'Ada Lovelace' }

describe('SettingsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' })
    server.use(http.get('*/auth/me/', () => HttpResponse.json(USER)))
  })

  it('prefills the profile and PATCHes an updated name', async () => {
    let patched: unknown = null
    server.use(
      http.patch('*/auth/me/', async ({ request }) => {
        patched = await request.json()
        return HttpResponse.json({ ...USER, name: 'Ada L.' })
      }),
    )
    renderWithProviders(<SettingsPage />)

    const name = await screen.findByLabelText(/display name/i)
    expect(name).toHaveValue('Ada Lovelace')
    expect(screen.getByLabelText(/email/i)).toHaveValue('admin@novusra.com')

    await userEvent.clear(name)
    await userEvent.type(name, 'Ada L.')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(patched).toEqual({ name: 'Ada L.' }))
  })

  it('changes the password when the fields match', async () => {
    let posted: unknown = null
    server.use(
      http.post('*/auth/password/change/', async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({ detail: 'ok' })
      }),
    )
    renderWithProviders(<SettingsPage />)
    await screen.findByLabelText(/display name/i)

    await userEvent.type(
      screen.getByLabelText(/current password/i),
      'OldPass2026!',
    )
    await userEvent.type(
      screen.getByLabelText(/^new password$/i),
      'FreshPass2026!',
    )
    await userEvent.type(
      screen.getByLabelText(/confirm new password/i),
      'FreshPass2026!',
    )
    await userEvent.click(
      screen.getByRole('button', { name: /change password/i }),
    )

    await waitFor(() =>
      expect(posted).toEqual({
        current_password: 'OldPass2026!',
        new_password: 'FreshPass2026!',
      }),
    )
  })

  it('blocks the change when the new passwords do not match', async () => {
    renderWithProviders(<SettingsPage />)
    await screen.findByLabelText(/display name/i)

    await userEvent.type(
      screen.getByLabelText(/current password/i),
      'OldPass2026!',
    )
    await userEvent.type(
      screen.getByLabelText(/^new password$/i),
      'FreshPass2026!',
    )
    await userEvent.type(
      screen.getByLabelText(/confirm new password/i),
      'Different2026!',
    )
    await userEvent.click(
      screen.getByRole('button', { name: /change password/i }),
    )

    expect(await screen.findByText(/don't match/i)).toBeInTheDocument()
  })
})
