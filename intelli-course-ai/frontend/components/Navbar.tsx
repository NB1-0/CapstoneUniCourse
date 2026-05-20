'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Search, Bell, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

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
  const [quickSearch, setQuickSearch] = useState('')
  const pageLabel = PAGE_LABELS[pathname] || 'IntelliCourse AI'

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (quickSearch.trim()) {
      router.push(`/finder?q=${encodeURIComponent(quickSearch.trim())}`)
    }
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-500" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-sm cursor-pointer">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </header>
  )
}
