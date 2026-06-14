'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  createGroup, renameGroup, deleteGroup,
} from '@/app/actions/groups'
import {
  createSubcategory, renameSubcategory, deleteSubcategory,
} from '@/app/actions/subcategories'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'

interface SubcategoryRow { id: string; name: string }
interface GroupRow { id: string; name: string; subcategories: SubcategoryRow[] }

interface Props {
  groups: GroupRow[]
}

type ModalState =
  | { kind: 'deleteGroup'; id: string; name: string; hasChildren: boolean }
  | { kind: 'deleteSubcategory'; id: string; name: string; hasExpenses: boolean }
  | null

export default function CategoriesManager({ groups }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [modal, setModal] = useState<ModalState>(null)

  // Inline form state
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [renameGroupValue, setRenameGroupValue] = useState('')

  const [addingSubFor, setAddingSubFor] = useState<string | null>(null)
  const [newSubName, setNewSubName] = useState('')
  const [renamingSubId, setRenamingSubId] = useState<string | null>(null)
  const [renameSubValue, setRenameSubValue] = useState('')

  const [error, setError] = useState<string | null>(null)
  const newGroupInputRef = useRef<HTMLInputElement>(null)
  const newSubInputRef = useRef<HTMLInputElement>(null)

  function refresh() { router.refresh() }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return
    setError(null)
    try {
      await createGroup(newGroupName)
      setNewGroupName('')
      setAddingGroup(false)
      refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleRenameGroup(id: string) {
    if (!renameGroupValue.trim()) return
    setError(null)
    try {
      await renameGroup(id, renameGroupValue)
      setRenamingGroupId(null)
      refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleDeleteGroup() {
    if (modal?.kind !== 'deleteGroup') return
    setError(null)
    startTransition(async () => {
      try {
        await deleteGroup(modal.id)
        setModal(null)
        refresh()
      } catch (e) {
        setError((e as Error).message)
        setModal(null)
      }
    })
  }

  async function handleCreateSubcategory(groupId: string) {
    if (!newSubName.trim()) return
    setError(null)
    try {
      await createSubcategory(newSubName, groupId)
      setNewSubName('')
      setAddingSubFor(null)
      refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleRenameSubcategory(id: string) {
    if (!renameSubValue.trim()) return
    setError(null)
    try {
      await renameSubcategory(id, renameSubValue)
      setRenamingSubId(null)
      refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleDeleteSubcategory() {
    if (modal?.kind !== 'deleteSubcategory') return
    setError(null)
    startTransition(async () => {
      try {
        await deleteSubcategory(modal.id)
        setModal(null)
        refresh()
      } catch (e) {
        setError((e as Error).message)
        setModal(null)
      }
    })
  }

  const inputStyle = {
    height: 38,
    padding: '0 12px',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-sm)',
    color: 'var(--ink-900)',
    background: 'var(--white)',
    border: '1.5px solid var(--border-strong, #DAD6CC)',
    borderRadius: 'var(--radius-md)',
    flex: 1,
    minWidth: 0,
  } as const

  const btnPrimary = {
    height: 38,
    padding: '0 16px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: 'var(--text-sm)',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--brand)',
    background: 'var(--brand)',
    color: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  }

  const btnSecondary = {
    height: 38,
    padding: '0 14px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: 'var(--text-sm)',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border-strong, #DAD6CC)',
    background: 'var(--white)',
    color: 'var(--ink-700)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  }

  const btnGhost = {
    height: 30,
    padding: '0 10px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: 'var(--text-xs)',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid transparent',
    background: 'transparent',
    color: 'var(--ink-500)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  }

  const btnDanger = {
    ...btnGhost,
    color: 'var(--negative-500)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--negative-50)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            color: 'var(--negative-700)',
          }}
        >
          {error}
        </div>
      )}

      {groups.map((group) => (
        <div
          key={group.id}
          style={{
            background: 'var(--white)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Group header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '14px 16px',
              borderBottom: '1px solid var(--line-soft)',
            }}
          >
            {renamingGroupId === group.id ? (
              <>
                <input
                  autoFocus
                  style={inputStyle}
                  value={renameGroupValue}
                  onChange={(e) => setRenameGroupValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameGroup(group.id)
                    if (e.key === 'Escape') setRenamingGroupId(null)
                  }}
                />
                <button style={btnPrimary} onClick={() => handleRenameGroup(group.id)}>Save</button>
                <button style={btnSecondary} onClick={() => setRenamingGroupId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 'var(--text-md)',
                    color: 'var(--ink-900)',
                    flex: 1,
                  }}
                >
                  {group.name}
                </span>
                <button
                  style={btnGhost}
                  onClick={() => {
                    setRenamingGroupId(group.id)
                    setRenameGroupValue(group.name)
                  }}
                >
                  Rename
                </button>
                <button
                  style={btnDanger}
                  onClick={() =>
                    setModal({
                      kind: 'deleteGroup',
                      id: group.id,
                      name: group.name,
                      hasChildren: group.subcategories.length > 0,
                    })
                  }
                >
                  Delete
                </button>
              </>
            )}
          </div>

          {/* Subcategories */}
          <div style={{ padding: '8px 0' }}>
            {group.subcategories.map((sub) => (
              <div
                key={sub.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px 8px 32px',
                }}
              >
                {renamingSubId === sub.id ? (
                  <>
                    <input
                      autoFocus
                      style={inputStyle}
                      value={renameSubValue}
                      onChange={(e) => setRenameSubValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubcategory(sub.id)
                        if (e.key === 'Escape') setRenamingSubId(null)
                      }}
                    />
                    <button style={btnPrimary} onClick={() => handleRenameSubcategory(sub.id)}>Save</button>
                    <button style={btnSecondary} onClick={() => setRenamingSubId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--ink-700)',
                        flex: 1,
                      }}
                    >
                      {sub.name}
                    </span>
                    <button
                      style={btnGhost}
                      onClick={() => {
                        setRenamingSubId(sub.id)
                        setRenameSubValue(sub.name)
                      }}
                    >
                      Rename
                    </button>
                    <button
                      style={btnDanger}
                      onClick={() =>
                        setModal({
                          kind: 'deleteSubcategory',
                          id: sub.id,
                          name: sub.name,
                          hasExpenses: false, // conservative — modal always warns
                        })
                      }
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}

            {/* Add subcategory inline */}
            {addingSubFor === group.id ? (
              <div style={{ display: 'flex', gap: 8, padding: '8px 16px 8px 32px' }}>
                <input
                  ref={newSubInputRef}
                  autoFocus
                  placeholder="Subcategory name"
                  style={inputStyle}
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateSubcategory(group.id)
                    if (e.key === 'Escape') { setAddingSubFor(null); setNewSubName('') }
                  }}
                />
                <button style={btnPrimary} onClick={() => handleCreateSubcategory(group.id)}>Add</button>
                <button style={btnSecondary} onClick={() => { setAddingSubFor(null); setNewSubName('') }}>Cancel</button>
              </div>
            ) : (
              <button
                style={{ ...btnGhost, display: 'block', margin: '4px 0 8px 32px', color: 'var(--brand)' }}
                onClick={() => { setAddingSubFor(group.id); setNewSubName('') }}
              >
                + Add subcategory
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Add group */}
      {addingGroup ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={newGroupInputRef}
            autoFocus
            placeholder="Group name"
            style={{ ...inputStyle, height: 44 }}
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateGroup()
              if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName('') }
            }}
          />
          <button style={{ ...btnPrimary, height: 44 }} onClick={handleCreateGroup}>Add group</button>
          <button style={{ ...btnSecondary, height: 44 }} onClick={() => { setAddingGroup(false); setNewGroupName('') }}>Cancel</button>
        </div>
      ) : (
        <button
          style={{
            ...btnPrimary,
            height: 44,
            alignSelf: 'flex-start',
          }}
          onClick={() => setAddingGroup(true)}
        >
          + Add group
        </button>
      )}

      {/* Modals */}
      <DeleteConfirmModal
        open={modal?.kind === 'deleteGroup'}
        title="Delete group"
        message={`"${modal?.kind === 'deleteGroup' ? modal.name : ''}" will be permanently deleted.`}
        hasChildren={modal?.kind === 'deleteGroup' ? modal.hasChildren : false}
        childrenWarning="All subcategories and their expenses will also be permanently deleted."
        onConfirm={handleDeleteGroup}
        onCancel={() => setModal(null)}
        confirmLabel="Delete group"
      />

      <DeleteConfirmModal
        open={modal?.kind === 'deleteSubcategory'}
        title="Delete subcategory"
        message={`"${modal?.kind === 'deleteSubcategory' ? modal.name : ''}" will be permanently deleted.`}
        hasChildren
        childrenWarning="All associated expenses will also be permanently deleted."
        onConfirm={handleDeleteSubcategory}
        onCancel={() => setModal(null)}
        confirmLabel="Delete subcategory"
      />
    </div>
  )
}
