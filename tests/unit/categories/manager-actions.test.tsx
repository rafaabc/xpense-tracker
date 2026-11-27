import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategoriesManager from '@/components/categories/CategoriesManager'

const actions = vi.hoisted(() => ({
  createGroup: vi.fn(), renameGroup: vi.fn(), deleteGroup: vi.fn(),
  createSubcategory: vi.fn(), renameSubcategory: vi.fn(), deleteSubcategory: vi.fn(),
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/app/actions/groups', () => actions)
vi.mock('@/app/actions/subcategories', () => actions)
vi.mock('@/components/shared/Toast', () => ({ useToast: () => toast }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const groups = [{ id: 'g1', name: 'Home', subcategories: [{ id: 's1', name: 'Rent' }] }]

beforeEach(() => {
  cleanup()
  vi.resetAllMocks()
})

function setup() {
  render(<CategoriesManager groups={groups} />)
  return userEvent.setup()
}
const button = (name: string, index = 0) => screen.getAllByRole('button', { name })[index]

// Each flow: how to open it, the action it calls and its arguments
const flows = [
  {
    flow: 'add group', open: ['+ Add group', 0], submit: 'Add group', action: 'createGroup',
    args: ['Food'], message: 'Group added',
  },
  {
    flow: 'rename group', open: ['Rename', 0], submit: 'Save', action: 'renameGroup',
    args: ['g1', 'Food'], message: 'Group renamed',
  },
  {
    flow: 'add subcategory', open: ['+ Add subcategory', 0], submit: 'Add', action: 'createSubcategory',
    args: ['Food', 'g1'], message: 'Subcategory added',
  },
  {
    flow: 'rename subcategory', open: ['Rename', 1], submit: 'Save', action: 'renameSubcategory',
    args: ['s1', 'Food'], message: 'Subcategory renamed',
  },
] as const

describe.each(flows)('CategoriesManager: $flow', ({ open, submit, action, args, message }) => {
  async function start() {
    const user = setup()
    await user.click(button(open[0], open[1]))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    return { user, input }
  }

  it('saves with the button and reports success', async () => {
    const { user, input } = await start()
    await user.type(input, 'Food')
    await user.click(button(submit))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(message))
    expect(actions[action]).toHaveBeenCalledWith(...args)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('saves with Enter and shows the server error', async () => {
    actions[action].mockRejectedValue(new Error('Server says no'))
    const { user, input } = await start()
    await user.type(input, 'Food{Enter}')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server says no'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows a returned error', async () => {
    actions[action].mockResolvedValue({ error: 'Server says no' })
    const { user, input } = await start()
    await user.type(input, 'Food{Enter}')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server says no'))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('rejects an empty name without calling the server', async () => {
    const { user } = await start()
    await user.click(button(submit))
    expect(toast.error).toHaveBeenCalled()
    expect(actions[action]).not.toHaveBeenCalled()
  })

  it.each(['Escape', 'Cancel'])('closes with %s', async (how) => {
    const { user, input } = await start()
    if (how === 'Escape') await user.type(input, '{Escape}')
    else await user.click(button('Cancel'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})

describe.each([
  { kind: 'group', index: 0, action: 'deleteGroup', id: 'g1', confirm: 'Delete group', message: 'Group deleted' },
  {
    kind: 'subcategory', index: 1, action: 'deleteSubcategory', id: 's1',
    confirm: 'Delete subcategory', message: 'Subcategory deleted',
  },
] as const)('CategoriesManager: delete $kind', ({ index, action, id, confirm, message }) => {
  async function start() {
    const user = setup()
    await user.click(button('Delete', index))
    return { user, dialog: screen.getByRole('dialog') }
  }

  it('deletes after confirmation', async () => {
    const { user, dialog } = await start()
    await user.click(within(dialog).getByRole('button', { name: confirm }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(message))
    expect(actions[action]).toHaveBeenCalledWith(id)
  })

  it('shows the server error and closes', async () => {
    actions[action].mockRejectedValue(new Error('Server says no'))
    const { user, dialog } = await start()
    await user.click(within(dialog).getByRole('button', { name: confirm }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server says no'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a returned error', async () => {
    actions[action].mockResolvedValue({ error: 'Server says no' })
    const { user, dialog } = await start()
    await user.click(within(dialog).getByRole('button', { name: confirm }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server says no'))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('keeps the record on cancel', async () => {
    const { user, dialog } = await start()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(actions[action]).not.toHaveBeenCalled()
  })
})
