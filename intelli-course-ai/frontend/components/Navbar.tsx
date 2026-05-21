'use client'
import { useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Search, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NotificationPanel } from '@/components/NotificationPanel'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import Link from 'next/link'

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/finder': 'AI Course Finder',
  '/learning-path': 'Learning Path',
  '/skill-gap': 'Skill Gap Analyzer',
  '/career': 'Career Explorer',
  '/saved': 'Saved Courses',
  '/settings': 'Settings',
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()

  const [quickSearch, setQuickSearch] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const pageLabel = PAGE_LABELS[pathname] || 'IntelliCourse AI'

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (quickSearch.trim()) {
      router.push(`/finder?q=${encodeURIComponent(quickSearch.trim())}`)
    }
  }

  const handleLogout = () => {
    setUserMenuOpen(false)
    logout()
    router.push('/')
  }

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-6 gap-4 sticky top-0 z-20">
      <div className="flex-1">
        <h1 className="text-base font-semibold text-foreground">{pageLabel}</h1>
      </div>

      <form onSubmit={handleQuickSearch} className="hidden md:flex items-center gap-2 flex-1 max-w-xs">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Quick search courses..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-background"
          />
        </div>
      </form>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false) }}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <motion.span
                key={unreadCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-blue-500 text-white text-[9px] font-bold leading-none"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </Button>
          <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false) }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-accent transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-sm">
              {user ? (
                <span className="text-white text-xs font-bold">{user.name.charAt(0).toUpperCase()}</span>
              ) : (
                <User className="w-3.5 h-3.5 text-white" />
              )}
            </div>
            {user && (
              <span className="hidden sm:block text-sm font-medium max-w-[80px] truncate">{user.name.split(' ')[0]}</span>
            )}
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {user ? (
                  <>
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="p-1">
                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors w-full text-left"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 transition-colors w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-1">
                    <Link
                      href="/auth/login"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors w-full"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors w-full"
                    >
                      Sign Up Free
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
