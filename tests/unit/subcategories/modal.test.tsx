import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'

// TC-07-06: Delete confirmation modal renders for subcategory
// TC-07-07: Modal warns about expense deletion when subcategory has expenses
// TC-07-10: Cancel leaves state unchanged
// TC-07-11: No parent-group edit option rendered

describe('TC-07-06: DeleteConfirmModal renders for subcategory deletion', () => {
  it('renders title and message when open', () => {
    render(
      <DeleteConfirmModal
        open
        title="Delete subcategory"
        message="This subcategory will be permanently deleted."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Delete subcategory')).toBeInTheDocument()
  })
})

describe('TC-07-07: Expense deletion warning', () => {
  it('shows expense warning when subcategory has expenses', () => {
    render(
      <DeleteConfirmModal
        open
        title="Delete subcategory"
        message="This subcategory will be permanently deleted."
        hasChildren
        childrenWarning="All associated expenses will also be permanently deleted."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(
      screen.getByText('All associated expenses will also be permanently deleted.')
    ).toBeInTheDocument()
  })

  it('does not show expense warning when subcategory has no expenses', () => {
    render(
      <DeleteConfirmModal
        open
        title="Delete subcategory"
        message="This subcategory will be permanently deleted."
        hasChildren={false}
        childrenWarning="All associated expenses will also be permanently deleted."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(
      screen.queryByText('All associated expenses will also be permanently deleted.')
    ).not.toBeInTheDocument()
  })
})

describe('TC-07-10: Cancel leaves state unchanged', () => {
  it('calls onCancel and not onConfirm when cancel is clicked', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <DeleteConfirmModal
        open
        title="Delete subcategory"
        message="This subcategory will be permanently deleted."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('TC-07-11: No parent-group edit option', () => {
  it('renders no input or control for changing parent group', () => {
    render(
      <DeleteConfirmModal
        open
        title="Delete subcategory"
        message="This subcategory will be permanently deleted."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.queryByLabelText(/parent group/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/move to/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/reassign/i)).not.toBeInTheDocument()
  })
})
