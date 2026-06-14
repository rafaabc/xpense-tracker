import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'

// TC-06-05: Delete confirmation modal renders
// TC-06-06: Modal shows cascade warning when group has subcategories
// TC-06-11: Cancel leaves state unchanged

describe('TC-06-05: DeleteConfirmModal renders for group deletion', () => {
  it('renders title and message when open', () => {
    render(
      <DeleteConfirmModal
        open
        title="Delete group"
        message="This group will be permanently deleted."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Delete group')).toBeInTheDocument()
    expect(screen.getByText('This group will be permanently deleted.')).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    render(
      <DeleteConfirmModal
        open={false}
        title="Delete group"
        message="This group will be permanently deleted."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('TC-06-06: Cascade warning when group has subcategories', () => {
  it('shows cascade warning when hasChildren is true', () => {
    render(
      <DeleteConfirmModal
        open
        title="Delete group"
        message="This group will be permanently deleted."
        hasChildren
        childrenWarning="All subcategories and their expenses will also be permanently deleted."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(
      screen.getByText('All subcategories and their expenses will also be permanently deleted.')
    ).toBeInTheDocument()
  })

  it('does not show cascade warning when hasChildren is false', () => {
    render(
      <DeleteConfirmModal
        open
        title="Delete group"
        message="This group will be permanently deleted."
        hasChildren={false}
        childrenWarning="All subcategories and their expenses will also be permanently deleted."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(
      screen.queryByText('All subcategories and their expenses will also be permanently deleted.')
    ).not.toBeInTheDocument()
  })
})

describe('TC-06-11: Cancel leaves state unchanged', () => {
  it('calls onCancel and not onConfirm when cancel is clicked', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <DeleteConfirmModal
        open
        title="Delete group"
        message="This group will be permanently deleted."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
