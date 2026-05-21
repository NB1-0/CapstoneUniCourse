'use client'
import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellRing, X, CheckCheck, Trash2, Search, Bookmark, BarChart3, Route, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotifications, type Notification, type NotificationType } from '@/contexts/NotificationContext'

const TYPE_META: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  search:        { icon: Search,    color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/40' },
  saved:         { icon: Bookmark,  color: 'text-emerald-600',bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  skill_gap:     { icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  learning_path: { icon: Route,     color: 'text-amber-600',  bg: 'bg-amber-100 dark:bg-amber-900/40' },
  career:        { icon: Briefcase, color: 'text-rose-600',   bg: 'bg-rose-100 dark:bg-rose-900/40' },
  system:        { icon: Bell,      color: 'text-slate-600',  bg: 'bg-slate-100 dark:bg-slate-800' },
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function NotifItem({ notif, onRead }: { notif: Notification; onRead: (id: string) => void }) {
  const meta = TYPE_META[notif.type]
  const Icon = meta.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      onClick={() => onRead(notif.id)}
      className={`flex gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${!notif.read ? 'bg-accent/30' : ''}`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${meta.bg}`}>
        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-medium leading-tight ${!notif.read ? 'text-foreground' : 'text-muted-foreground'}`}>
            {notif.title}
          </p>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(notif.timestamp)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">{notif.message}</p>
      </div>
      {!notif.read && (
        <div className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}
    </motion.div>
  )
}

interface Props {
  open: boolean
  onClose: () => void
}

export function NotificationPanel({ open, onClose }: Props) {
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              {unreadCount > 0 ? <BellRing className="w-4 h-4 text-primary" /> : <Bell className="w-4 h-4 text-muted-foreground" />}
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded-full">{unreadCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} title="Mark all read" className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} title="Clear all" className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Activity will appear here in real time</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {notifications.map(n => (
                  <NotifItem key={n.id} notif={n} onRead={markRead} />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-muted/30">
              <p className="text-[10px] text-muted-foreground text-center">
                Real-time updates via Server-Sent Events
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
