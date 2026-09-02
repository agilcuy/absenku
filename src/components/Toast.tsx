'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  title?: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type, title }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => {
          let bg = 'rgba(30, 41, 59, 0.95)'
          let border = 'rgba(255, 255, 255, 0.1)'
          let icon = 'ℹ️'

          if (t.type === 'success') {
            bg = 'rgba(16, 185, 129, 0.15)'
            border = 'rgba(16, 185, 129, 0.4)'
            icon = '✅'
          } else if (t.type === 'warning') {
            bg = 'rgba(245, 158, 11, 0.15)'
            border = 'rgba(245, 158, 11, 0.4)'
            icon = '⚠️'
          } else if (t.type === 'error') {
            bg = 'rgba(239, 68, 68, 0.15)'
            border = 'rgba(239, 68, 68, 0.4)'
            icon = '❌'
          }

          return (
            <div
              key={t.id}
              onClick={() => removeToast(t.id)}
              className="cursor-pointer p-4 rounded-xl shadow-2xl backdrop-blur-md flex items-start gap-3 border animate-fade-in-up transition-all"
              style={{
                background: bg,
                borderColor: border,
                minWidth: '280px',
                maxWidth: '380px',
              }}
            >
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div className="flex-1">
                {t.title && <div className="font-semibold text-sm text-white mb-0.5">{t.title}</div>}
                <div className="text-xs text-gray-200 leading-relaxed">{t.message}</div>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
