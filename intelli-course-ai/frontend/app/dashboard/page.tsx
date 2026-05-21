'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { Sidebar } from '@/components/Sidebar'
import { Navbar } from '@/components/Navbar'
import { DashboardStats } from '@/components/DashboardStats'
import { CourseCard } from '@/components/CourseCard'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import type { CourseResult } from '@/types'

const ACTIVITY_DATA = [
  { day: 'Mon', searches: 3 }, { day: 'Tue', searches: 7 }, { day: 'Wed', searches: 2 },
  { day: 'Thu', searches: 9 }, { day: 'Fri', searches: 5 }, { day: 'Sat', searches: 4 }, { day: 'Sun', searches: 8 },
]

const SKILL_RADAR_DATA = [
  { skill: 'Python', level: 80 }, { skill: 'ML', level: 60 }, { skill: 'SQL', level: 70 },
  { skill: 'Deep Learning', level: 40 }, { skill: 'Cloud', level: 55 }, { skill: 'Statistics', level: 65 },
]

export default function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [trending, setTrending] = useState<CourseResult[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { addNotification } = useNotifications()

  const savedCourses = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('savedCourseData') || '[]') : []
  const userSkills = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('userSkills') || '[]') : []

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.search('machine learning data science', {}, 3)
        setTrending(res.results.slice(0, 3))
        addNotification('system', 'Dashboard loaded', `Found ${res.total} courses ready to explore.`)
      } catch {
        setTrending([])
      } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = {
    saved: savedCourses.length,
    skills: userSkills.length,
    paths: parseInt(typeof window !== 'undefined' ? localStorage.getItem('pathsGenerated') || '0' : '0'),
    readiness: 58,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
            {/* Welcome */}
            <div>
              <h1 className="text-2xl font-bold">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
                {user ? user.name.split(' ')[0] : 'Explorer'}!
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Here&apos;s an overview of your learning journey.</p>
            </div>

            {/* Stats */}
            <DashboardStats stats={stats} />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity */}
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Weekly Search Activity</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={ACTIVITY_DATA}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="searches" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Skill radar */}
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Skill Profile (Sample)</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <RadarChart data={SKILL_RADAR_DATA}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Radar dataKey="level" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trending courses */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Trending Courses</h3>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {trending.map((course) => <CourseCard key={course.id} course={course} />)}
                </div>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
