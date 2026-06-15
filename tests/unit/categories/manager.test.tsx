import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategoriesManager from '@/components/CategoriesManager'

// TC-06-05: Delete confirmation modal shown for group
// TC-06-06: Modal warns about cascade when group has subcategories
// TC-06-11: Cancel leaves state unchanged
// TC-07-06: Delete confirmation modal shown for subcategory
// TC-07-07: Modal warns about expense deletion
// TC-07-10: Cancel leaves state unchanged
// TC-07-11: No parent-group edit option on subcategory

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/app/actions/groups', () => ({
  createGroup: vi.fn().mockResolvedValue({}),
  renameGroup: vi.fn().mockResolvedValue({}),
  deleteGroup: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/app/actions/subcategories', () => ({
  createSubcategory: vi.fn().mockResolvedValue({}),
  renameSubcategory: vi.fn().mockResolvedValue({}),
  deleteSubcategory: vi.fn().mockResolvedValue({}),
}))

const groups = [
  {
    id: 'g1',
    name: 'Casa',
    subcategories: [{ id: 's1', name: 'Rent' }],
  },
  {
    id: 'g2',
    name: 'Food',
    subcategories: [],
  },
]

describe('CategoriesManager — group deletion', () => {
  it('TC-06-05: clicking Delete on group opens confirm dialog', async () => {
    const user = userEvent.setup()
    render(<CategoriesManager groups={groups} />)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0]) // first group's delete
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('TC-06-06: cascade warning shown when group has subcategories', async () => {
    const user = userEvent.setup()
    render(<CategoriesManager groups={groups} />)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0]) // Casa has subcategories
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('TC-06-11: Cancel on modal closes dialog', async () => {
    const user = userEvent.setup()
    render(<CategoriesManager groups={groups} />)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('CategoriesManager — subcategory deletion', () => {
  // Delete buttons order: [0] Casa group, [1] Rent subcategory, [2] Food group
  it('TC-07-06: clicking Delete on subcategory opens confirm dialog', async () => {
    const user = userEvent.setup()
    render(<CategoriesManager groups={groups} />)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[1]) // Rent subcategory
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('TC-07-07: subcategory delete modal always shows expense warning', async () => {
    const user = userEvent.setup()
    render(<CategoriesManager groups={groups} />)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[1]) // Rent subcategory
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('TC-07-10: Cancel on subcategory modal closes dialog', async () => {
    const user = userEvent.setup()
    render(<CategoriesManager groups={groups} />)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[1]) // Rent subcategory
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('TC-07-11: no parent-group edit/reassign control visible on subcategory row', () => {
    render(<CategoriesManager groups={groups} />)
    // Verify no "Change group" or "Move to" type control exists
    expect(screen.queryByRole('button', { name: /change group/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /move to/i })).not.toBeInTheDocument()
  })
})

describe('CategoriesManager — add group inline', () => {
  it('clicking "+ Add group" button shows the inline input', async () => {
    const user = userEvent.setup()
    render(<CategoriesManager groups={groups} />)
    await user.click(screen.getByRole('button', { name: /add group/i }))
    expect(screen.getByPlaceholderText(/group name/i)).toBeInTheDocument()
  })
})
