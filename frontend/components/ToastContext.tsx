"use client"
import React, { createContext, useContext, useMemo, useState, useCallback } from 'react'

type Toast = { id: string; title?: string; description?: string; type?: 'success' | 'error' | 'info' }

const ToastContext = createContext<{
  info(arg0: string): unknown;
  error(arg0: any): unknown;
  success(arg0: string): unknown; push: (t: Toast) => void 
} | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((t: Toast) => {
    const id = String(Date.now())
    setToasts((s) => [...s, { ...t, id }])
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 5000)
  }, [setToasts])

  const info = useCallback((message: string) => {
    return push({
      title: message, type: 'info',
      id: ''
    });
  }, [push])

  const success = useCallback((message: string) => {
    push({
      title: message, type: 'success',
      id: ''
    })
  }, [push])

  const error = useCallback((err: any) => {
    const message = typeof err === 'string' ? err : (err?.message ?? 'An error occurred')
    push({
      title: message, type: 'error',
      id: ''
    })
  }, [push])

  const value = useMemo(() => ({ push, info, success, error }), [push, info, success, error])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 bottom-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className={`p-3 rounded shadow ${t.type === 'error' ? 'bg-red-100 border border-red-300' : 'bg-white border'}`}>
            {t.title && <div className="font-semibold">{t.title}</div>}
            {t.description && <div className="text-sm text-gray-700">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
