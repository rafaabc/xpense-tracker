'use client'

interface Props {
  open: boolean
  title: string
  message: string
  /** When true, shows cascade warning about nested records being deleted */
  hasChildren?: boolean
  childrenWarning?: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
}

export default function DeleteConfirmModal({
  open,
  title,
  message,
  hasChildren = false,
  childrenWarning,
  onConfirm,
  onCancel,
  confirmLabel = 'Delete',
}: Props) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        background: 'rgba(20, 32, 27, 0.48)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        style={{
          background: 'var(--white, #fff)',
          borderRadius: 'var(--radius-xl, 22px)',
          boxShadow: 'var(--shadow-xl, 0 16px 48px rgba(20,50,38,0.14))',
          width: '100%',
          maxWidth: 400,
          padding: '28px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <h2
          id="modal-title"
          style={{
            fontFamily: 'var(--font-display, "Space Grotesk", sans-serif)',
            fontWeight: 600,
            fontSize: 'var(--text-xl, 20px)',
            color: 'var(--ink-900, #14201B)',
            margin: 0,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            fontFamily: 'var(--font-sans, "Hanken Grotesk", sans-serif)',
            fontSize: 'var(--text-md, 16px)',
            color: 'var(--ink-500, #5A6B62)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        {hasChildren && childrenWarning && (
          <div
            role="alert"
            style={{
              background: 'var(--negative-50, #FCEBEA)',
              borderRadius: 'var(--radius-md, 12px)',
              padding: '10px 14px',
              fontFamily: 'var(--font-sans, "Hanken Grotesk", sans-serif)',
              fontSize: 'var(--text-sm, 14px)',
              color: 'var(--negative-700, #B5292E)',
              lineHeight: 1.5,
            }}
          >
            {childrenWarning}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: 40,
              padding: '0 18px',
              fontFamily: 'var(--font-sans, "Hanken Grotesk", sans-serif)',
              fontWeight: 600,
              fontSize: 'var(--text-sm, 14px)',
              borderRadius: 'var(--radius-md, 12px)',
              border: '1.5px solid var(--border-strong, #DAD6CC)',
              background: 'var(--white, #fff)',
              color: 'var(--ink-700, #2C3A33)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              height: 40,
              padding: '0 18px',
              fontFamily: 'var(--font-sans, "Hanken Grotesk", sans-serif)',
              fontWeight: 600,
              fontSize: 'var(--text-sm, 14px)',
              borderRadius: 'var(--radius-md, 12px)',
              border: '1.5px solid var(--negative-500, #E0494E)',
              background: 'var(--negative-500, #E0494E)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
