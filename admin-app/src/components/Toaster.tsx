import { useEffect, useState } from 'react'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

let toasts: Toast[] = []
let listeners: Array<(toasts: Toast[]) => void> = []

export function toast({ title, description, variant = 'default' }: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substr(2, 9)
  const newToast = { id, title, description, variant }
  toasts = [...toasts, newToast]
  listeners.forEach(listener => listener(toasts))
  
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    listeners.forEach(listener => listener(toasts))
  }, 5000)
}

export function Toaster() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])

  useEffect(() => {
    listeners.push(setCurrentToasts)
    return () => {
      listeners = listeners.filter(l => l !== setCurrentToasts)
    }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {currentToasts.map(t => (
        <div
          key={t.id}
          className={`p-4 rounded-lg shadow-lg max-w-sm ${
            t.variant === 'destructive'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-card text-card-foreground border'
          }`}
        >
          <div className="font-semibold">{t.title}</div>
          {t.description && <div className="text-sm mt-1 opacity-90">{t.description}</div>}
        </div>
      ))}
    </div>
  )
}
