'use client'
import { motion } from 'framer-motion'
import { Briefcase, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { CourseCard } from '@/components/CourseCard'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { CareerAlignResponse, CourseResult } from '@/types'

interface CareerMatchCardProps {
  data: CareerAlignResponse | null
  isLoading?: boolean
  onSave?: (course: CourseResult) => void
}

export function CareerMatchCard({ data, isLoading, onSave }: CareerMatchCardProps) {
  const [roadmapExpanded, setRoadmapExpanded] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const scoreColor = data.alignment_score >= 70 ? 'from-emerald-500 to-emerald-600' : data.alignment_score >= 40 ? 'from-amber-500 to-amber-600' : 'from-rose-500 to-rose-600'

  return (
    <div className="space-y-6">
      {/* Career alignment summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className={cn('w-16 h-16 rounded-xl flex-shrink-0 bg-gradient-to-br flex items-center justify-center shadow-lg', scoreColor)}>
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg">{data.career_goal}</h2>
            <div className="flex items-center gap-2 mt-1 mb-3">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{Math.round(data.alignment_score)}% alignment with your current profile</span>
            </div>
            <Progress value={data.alignment_score} className="h-2" />
          </div>
        </div>

        {/* Key skills */}
        <div className="mt-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Skills Needed</p>
          <div className="flex flex-wrap gap-2">
            {data.key_skills_needed.map((skill) => (
              <span key={skill} className="skill-badge">{skill}</span>
            ))}
          </div>
        </div>

        {/* Career roadmap */}
        <div className="mt-4 border-t border-border pt-4">
          <button
            onClick={() => setRoadmapExpanded(!roadmapExpanded)}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full text-left"
          >
            🗺 Career Roadmap
            {roadmapExpanded ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
          </button>
          {roadmapExpanded && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {data.career_roadmap}
            </motion.p>
          )}
        </div>
      </motion.div>

      {/* Aligned courses */}
      {data.aligned_courses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Aligned Courses ({data.aligned_courses.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.aligned_courses.slice(0, 6).map((course) => (
              <CourseCard key={course.id} course={course} onSave={onSave} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
