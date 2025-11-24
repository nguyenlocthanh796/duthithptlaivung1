import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

let toastId = 0
const listeners = new Set()

export function useToast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const listener = (newToast) => {
      setToasts((prev) => [...prev, newToast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
      }, 5000)
    }
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, [])

  const showToast = (message, type = 'info') => {
    const id = toastId++
    const toast = { id, message, type }
    listeners.forEach((listener) => listener(toast))
    return id
  }

  return {
    toasts,
    showToast,
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    warning: (msg) => showToast(msg, 'warning'),
    info: (msg) => showToast(msg, 'info'),
  }
}

export function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed top-20 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`min-w-[300px] rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : toast.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      ))}
    </div>,
    document.body
  )
}