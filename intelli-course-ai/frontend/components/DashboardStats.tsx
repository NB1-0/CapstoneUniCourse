'use client'
import { motion } from 'framer-motion'
import { Bookmark, Brain, Route, TrendingUp, Search, BarChart3, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface StatsData {
  saved: number
  skills: number
  paths: number
  readiness: number
}

interface DashboardStatsProps {
  stats: StatsData
}

const STAT_CARDS = [
  { key: 'saved', label: 'Saved Courses', icon: Bookmark, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400' },
  { key: 'skills', label: 'Skills Tracked', icon: Brain, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400' },
  { key: 'paths', label: 'Paths Generated', icon: Route, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'readiness', label: 'Avg Readiness', icon: TrendingUp, suffix: '%', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-600 dark:text-amber-400' },
]

const QUICK_ACTIONS = [
  { label: 'Search Courses', href: '/finder', icon: Search, desc: 'Find your next course with AI' },
  { label: 'Analyze Skills', href: '/skill-gap', icon: BarChart3, desc: 'Discover your skill gaps' },
  { label: 'Plan Path', href: '/learning-path', icon: Route, desc: 'Build a learning roadmap' },
]

function CountUp({ value }: { value: number }) {
  return <span>{value}</span>
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg, text, suffix }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className={`text-3xl font-bold ${text}`}>
              <CountUp value={stats[key as keyof StatsData]} />{suffix || ''}
            </div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map(({ label, href, icon: Icon, desc }, i) => (
            <motion.div key={href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }}>
              <Link href={href}>
                <div className="glass-card rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all group cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
