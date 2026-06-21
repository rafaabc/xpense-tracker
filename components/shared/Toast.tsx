'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

/* ------------------------------------------------------------------
   Toast system — provides `useToast()` with `.success()` / `.error()`
   ------------------------------------------------------------------ */

type ToastVariant = 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const show = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = ++nextId
      setToasts((prev) => [...prev, { id, message, variant }])
      const timer = setTimeout(() => dismiss(id), 3500)
      timersRef.current.set(id, timer)
    },
    [dismiss],
  )

  const ctx: ToastContextValue = {
    success: useCallback((msg: string) => show(msg, 'success'), [show]),
    error: useCallback((msg: string) => show(msg, 'error'), [show]),
  }

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
    }
  }, [])

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast container — fixed, top-center, above modals (z-index 60) */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            width: '100%',
            maxWidth: 420,
            padding: '0 16px',
            pointerEvents: 'none',
          }}
        >
          {toasts.map((t) => (
            <ToastBubble key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

/* ------------------------------------------------------------------
   Individual toast bubble
   ------------------------------------------------------------------ */

const VARIANT_STYLES: Record<
  ToastVariant,
  { bg: string; color: string; accent: string; Icon: typeof CheckCircle }
> = {
  success: {
    bg: 'var(--positive-50)',
    color: 'var(--positive-700)',
    accent: 'var(--positive-500)',
    Icon: CheckCircle,
  },
  error: {
    bg: 'var(--negative-50)',
    color: 'var(--negative-700)',
    accent: 'var(--negative-500)',
    Icon: AlertCircle,
  },
}

function ToastBubble({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: (id: number) => void
}) {
  const [visible, setVisible] = useState(false)
  const { bg, color, accent, Icon } = VARIANT_STYLES[toast.variant]

  // Entrance animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      role="status"
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        background: bg,
        borderRadius: 'var(--radius-md, 12px)',
        boxShadow: 'var(--shadow-lg, 0 8px 24px rgba(20,50,38,0.10))',
        borderLeft: `3px solid ${accent}`,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm, 14px)',
        color,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'opacity 200ms ease-out, transform 200ms ease-out',
        cursor: 'pointer',
      }}
      onClick={() => onDismiss(toast.id)}
    >
      <Icon size={18} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontWeight: 500, lineHeight: 1.4 }}>
        {toast.message}
      </span>
      <X
        size={14}
        style={{
          flexShrink: 0,
          opacity: 0.6,
          cursor: 'pointer',
        }}
      />
    </div>
  )
}
