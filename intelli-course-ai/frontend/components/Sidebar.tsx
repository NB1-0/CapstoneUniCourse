'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, Search, Route, BarChart3, Briefcase,
  Bookmark, Settings, ChevronLeft, ChevronRight, Moon, Sun,
  GraduationCap, Sparkles, Share2, Map, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Course Finder', href: '/finder', icon: Search },
  { label: 'Learning Path', href: '/learning-path', icon: Route },
  { label: 'Skill Gap', href: '/skill-gap', icon: BarChart3 },
  { label: 'Career Explorer', href: '/career', icon: Briefcase },
  { label: 'Knowledge Graph', href: '/graph', icon: Share2 },
  { label: 'Learning Maps', href: '/learning-map', icon: Map, badge: 'New' },
  { label: 'Market Intel', href: '/market', icon: TrendingUp, badge: 'New' },
  { label: 'Saved Courses', href: '/saved', icon: Bookmark },
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-card border-r border-border overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border min-h-[72px]">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              <div className="font-bold text-sm leading-tight">IntelliCourse</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Platform
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href} title={isCollapsed ? item.label : undefined}>
              <div className={cn('sidebar-item', isActive && 'active', isCollapsed && 'justify-center px-0')}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm truncate flex-1">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!isCollapsed && 'badge' in item && item.badge && (
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom controls */}
      <div className="px-3 pb-4 space-y-2 border-t border-border pt-3">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn('sidebar-item w-full', isCollapsed && 'justify-center px-0')}
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-8 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-accent transition-colors z-10"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  )
}
