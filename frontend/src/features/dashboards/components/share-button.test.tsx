import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ShareButton } from './share-button'

describe('ShareButton', () => {
  it('copies the current url and confirms inline', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(<ShareButton />)

    await userEvent.click(screen.getByRole('button', { name: /compartir/i }))

    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(await screen.findByText(/¡copiado!/i)).toBeInTheDocument()
  })
})
