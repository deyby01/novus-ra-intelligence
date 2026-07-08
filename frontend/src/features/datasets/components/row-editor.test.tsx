import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DatasetField } from '../types'
import { RowEditor } from './row-editor'

const fields: DatasetField[] = [
  {
    id: 'f1',
    dataset: 'd1',
    key: 'region',
    label: 'Region',
    field_type: 'text',
    order: 0,
  },
  {
    id: 'f2',
    dataset: 'd1',
    key: 'units',
    label: 'Units',
    field_type: 'number',
    order: 1,
  },
  {
    id: 'f3',
    dataset: 'd1',
    key: 'active',
    label: 'Active',
    field_type: 'boolean',
    order: 2,
  },
]

const noop = () => {}

describe('RowEditor', () => {
  it('coerces control values into a typed row on submit', async () => {
    const onSubmit = vi.fn()
    render(
      <RowEditor
        fields={fields}
        title="Add row"
        isSaving={false}
        onSubmit={onSubmit}
        onCancel={noop}
      />,
    )

    await userEvent.type(screen.getByLabelText('Region'), 'North')
    await userEvent.type(screen.getByLabelText('Units'), '42')
    await userEvent.click(screen.getByLabelText('Active'))
    await userEvent.click(screen.getByRole('button', { name: /save row/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      region: 'North',
      units: 42,
      active: true,
    })
  })

  it('coerces a blank number field to null', async () => {
    const onSubmit = vi.fn()
    render(
      <RowEditor
        fields={fields}
        title="Add row"
        isSaving={false}
        onSubmit={onSubmit}
        onCancel={noop}
      />,
    )

    await userEvent.type(screen.getByLabelText('Region'), 'North')
    await userEvent.click(screen.getByRole('button', { name: /save row/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      region: 'North',
      units: null,
      active: false,
    })
  })

  it('calls onCancel without submitting', async () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    render(
      <RowEditor
        fields={fields}
        title="Add row"
        isSaving={false}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('surfaces a save error', () => {
    render(
      <RowEditor
        fields={fields}
        title="Add row"
        isSaving={false}
        error
        onSubmit={noop}
        onCancel={noop}
      />,
    )

    expect(screen.getByText(/couldn't save the row/i)).toBeInTheDocument()
  })

  it('pre-fills the controls from initial data when editing', () => {
    render(
      <RowEditor
        fields={fields}
        title="Edit row"
        initialData={{ region: 'South', units: 7, active: false }}
        isSaving={false}
        onSubmit={noop}
        onCancel={noop}
      />,
    )

    expect(screen.getByLabelText('Region')).toHaveValue('South')
    expect(screen.getByLabelText('Units')).toHaveValue(7)
    expect(screen.getByLabelText('Active')).not.toBeChecked()
  })
})
