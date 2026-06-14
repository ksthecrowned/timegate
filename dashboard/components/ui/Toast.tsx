'use client'
import { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  success: () => {}, error: () => {}, warning: () => {}, info: () => {},
})

export function useToast() { return useContext(ToastContext) }

const icons: Record<ToastType, React.ReactNode> = {
  success: <i className="fa-solid fa-circle-check text-teal-500 text-lg" />,
  error:   <i className="fa-solid fa-circle-xmark text-red-500 text-lg" />,
  warning: <i className="fa-solid fa-triangle-exclamation text-yellow-500 text-lg" />,
  info:    <i className="fa-solid fa-circle-info text-blue-500 text-lg" />,
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Date.now()
    setToasts(t => [...t, { id, type, title, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  const ctx: ToastContextValue = {
    success: (t, m) => add('success', t, m),
    error:   (t, m) => add('error', t, m),
    warning: (t, m) => add('warning', t, m),
    info:    (t, m) => add('info', t, m),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id}
            className="flex items-start gap-x-3 p-4 bg-white border border-gray-200 rounded-xl shadow-lg dark:bg-neutral-800 dark:border-neutral-700 max-w-sm animate-[slideIn_0.2s_ease-out]"
            style={{ animation: 'slideIn 0.2s ease-out' }}>
            <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{toast.title}</p>
              {toast.message && <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">{toast.message}</p>}
            </div>
            <button onClick={() => setToasts(t => t.filter(x => x.id !== toast.id))}
              className="ms-auto shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200">
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(1rem); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}
