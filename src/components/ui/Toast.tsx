import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getErrorMessage } from '@/domain/errors'
import styles from './Toast.module.css'

interface ToastAction {
  label: string
  onClick: () => void | Promise<void>
}

interface ToastMessage {
  id: string
  text: string
  action?: ToastAction
}

interface ToastContextValue {
  show: (text: string, action?: ToastAction) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 2500
// Keeps the stack from piling up when several actions happen in quick succession — only the
// most recent couple of toasts stay on screen, older ones are dropped immediately.
const MAX_VISIBLE_TOASTS = 2
const APP_ERROR_EVENT = 'app:error'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const show = useCallback((text: string, action?: ToastAction) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev.slice(-(MAX_VISIBLE_TOASTS - 1)), { id, text, action }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  // Surfaces errors from outside React (e.g. an unhandled promise rejection caught in
  // main.tsx) so a background failure is never completely invisible to the user.
  useEffect(() => {
    function handleAppError(event: Event) {
      const detail = (event as CustomEvent<string>).detail
      show(typeof detail === 'string' ? detail : 'Ha ocurrido un error inesperado')
    }
    window.addEventListener(APP_ERROR_EVENT, handleAppError)
    return () => window.removeEventListener(APP_ERROR_EVENT, handleAppError)
  }, [show])

  async function handleActionClick(toast: ToastMessage) {
    setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    try {
      await toast.action?.onClick()
    } catch (error) {
      show(getErrorMessage(error))
    }
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className={styles.stack}>
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              className={styles.toast}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <span>{toast.text}</span>
              {toast.action && (
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => handleActionClick(toast)}
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
