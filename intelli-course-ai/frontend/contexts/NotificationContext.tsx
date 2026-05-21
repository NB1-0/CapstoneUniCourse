'use client'
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

export type NotificationType = 'search' | 'saved' | 'skill_gap' | 'learning_path' | 'career' | 'system'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
}

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  addNotification: (type: NotificationType, title: string, message: string) => void
  markAllRead: () => void
  markRead: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
    : 'http://localhost:8000'

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const esRef = useRef<EventSource | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addNotification = useCallback((type: NotificationType, title: string, message: string) => {
    setNotifications(prev => [{
      id: crypto.randomUUID(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
    }, ...prev].slice(0, 50))
  }, [])

  const markAllRead = useCallback(() =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true }))), [])

  const markRead = useCallback((id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)), [])

  const clearAll = useCallback(() => setNotifications([]), [])

  // SSE real-time connection — gracefully degrades if backend is offline
  useEffect(() => {
    let destroyed = false

    const connect = () => {
      if (destroyed || typeof EventSource === 'undefined') return
      try {
        const es = new EventSource(`${API_BASE}/api/notifications/stream`)
        esRef.current = es

        es.addEventListener('notification', (e) => {
          try {
            const data = JSON.parse(e.data)
            addNotification(data.type ?? 'system', data.title, data.message)
          } catch {}
        })

        es.onerror = () => {
          es.close()
          esRef.current = null
          if (!destroyed) reconnectRef.current = setTimeout(connect, 12_000)
        }
      } catch {}
    }

    // Small delay so the page renders first
    reconnectRef.current = setTimeout(connect, 1_500)

    return () => {
      destroyed = true
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      esRef.current?.close()
    }
  }, [addNotification])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, markRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}
