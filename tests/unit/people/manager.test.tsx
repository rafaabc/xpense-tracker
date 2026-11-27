import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PeopleManager from '@/components/people/PeopleManager'

const actions = vi.hoisted(() => ({
  createPerson: vi.fn(),
  renamePerson: vi.fn(),
  deletePerson: vi.fn(),
  updateDefaultSplit: vi.fn(),
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))

vi.mock('@/app/actions/people', () => actions)
vi.mock('@/components/shared/Toast', () => ({ useToast: () => toast }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const SELF = { id: 'p-self', name: 'Rafa', isSelf: true, defaultShareBps: 6000 }
const ANA = { id: 'p-ana', name: 'Ana', isSelf: false, defaultShareBps: 4000 }

beforeEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('PeopleManager', () => {
  it('offers delete for other people but not for self', () => {
    render(<PeopleManager people={[SELF, ANA]} />)
    expect(screen.getByRole('button', { name: 'Delete Ana' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Rafa' })).not.toBeInTheDocument()
  })

  it('TC-17-05: hides the default split while only self exists', () => {
    render(<PeopleManager people={[{ ...SELF, defaultShareBps: 10000 }]} />)
    expect(screen.queryByText('Default split')).not.toBeInTheDocument()
  })

  it('adds a person', async () => {
    const user = userEvent.setup()
    render(<PeopleManager people={[SELF]} />)
    await user.type(screen.getByLabelText('New person name'), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    await waitFor(() => expect(actions.createPerson).toHaveBeenCalledWith('Ana'))
  })

  it('TC-16-02: shows a validation error for a blank name without calling the action', async () => {
    const user = userEvent.setup()
    render(<PeopleManager people={[SELF]} />)
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    expect(toast.error).toHaveBeenCalledWith('Name is required')
    expect(actions.createPerson).not.toHaveBeenCalled()
  })

  it('shows the server error message', async () => {
    actions.createPerson.mockRejectedValue(new Error('A person with this name already exists'))
    const user = userEvent.setup()
    render(<PeopleManager people={[SELF]} />)
    await user.type(screen.getByLabelText('New person name'), 'rafa')
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('A person with this name already exists'))
  })

  it('renames a person', async () => {
    const user = userEvent.setup()
    render(<PeopleManager people={[SELF, ANA]} />)
    await user.click(screen.getByRole('button', { name: 'Rename Ana' }))
    const input = screen.getByLabelText('Name for Ana')
    await user.clear(input)
    await user.type(input, 'Anna{Enter}')
    await waitFor(() => expect(actions.renamePerson).toHaveBeenCalledWith('p-ana', 'Anna'))
  })

  it('deletes a person after confirmation', async () => {
    const user = userEvent.setup()
    render(<PeopleManager people={[SELF, ANA]} />)
    await user.click(screen.getByRole('button', { name: 'Delete Ana' }))
    expect(actions.deletePerson).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Delete person' }))
    await waitFor(() => expect(actions.deletePerson).toHaveBeenCalledWith('p-ana'))
  })

  it('saves the default split as entered', async () => {
    const user = userEvent.setup()
    render(<PeopleManager people={[SELF, ANA]} />)
    const mine = screen.getByLabelText('Rafa percentage')
    const hers = screen.getByLabelText('Ana percentage')
    expect(mine).toHaveValue('60')
    await user.clear(mine)
    await user.type(mine, '50')
    await user.clear(hers)
    await user.type(hers, '50')
    await user.click(screen.getByRole('button', { name: 'Save split' }))
    await waitFor(() => expect(actions.updateDefaultSplit).toHaveBeenCalledWith([
      { personId: 'p-self', percent: '50' },
      { personId: 'p-ana', percent: '50' },
    ]))
  })

  it.each([
    ['30', 'Percentages must add up to 100'],
    ['abc', 'Percentage must be between 0 and 100 with up to 2 decimal places'],
  ])('rejects %j before calling the action', async (value, message) => {
    const user = userEvent.setup()
    render(<PeopleManager people={[SELF, ANA]} />)
    const hers = screen.getByLabelText('Ana percentage')
    await user.clear(hers)
    await user.type(hers, value)
    await user.click(screen.getByRole('button', { name: 'Save split' }))
    expect(toast.error).toHaveBeenCalledWith(message)
    expect(actions.updateDefaultSplit).not.toHaveBeenCalled()
  })
})
