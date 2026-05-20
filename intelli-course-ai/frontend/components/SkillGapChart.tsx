'use client'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { CourseCard } from '@/components/CourseCard'
import { cn } from '@/lib/utils'
import type { SkillGapResponse, CourseResult } from '@/types'

interface SkillGapChartProps {
  data: SkillGapResponse | null
  isLoading?: boolean
  onSave?: (course: CourseResult) => void
}

const IMPORTANCE_CONFIG = {
  critical: { label: 'Critical', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950' },
  important: { label: 'Important', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950' },
  'nice-to-have': { label: 'Nice to have', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950' },
}

export function SkillGapChart({ data, isLoading, onSave }: SkillGapChartProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const radarData = data.required_skills.slice(0, 8).map((skill) => ({
    skill: skill.length > 12 ? skill.slice(0, 12) + '…' : skill,
    required: 100,
    current: data.current_skills.some((s) => s.toLowerCase().includes(skill.toLowerCase())) ? 100 : 20,
  }))

  const scoreColor = data.readiness_score >= 70 ? 'text-emerald-600' : data.readiness_score >= 40 ? 'text-amber-600' : 'text-rose-600'

  const coursesToShow = data.skill_gaps.filter((g) => !g.have && g.courses_to_fill_gap.length > 0).slice(0, 2)

  return (
    <div className="space-y-6">
      {/* Score + radar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Readiness score */}
        <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-muted-foreground mb-2">Overall Readiness</p>
          <div className={cn('text-6xl font-bold mb-1', scoreColor)}>{Math.round(data.readiness_score)}%</div>
          <p className="text-sm text-muted-foreground mb-4">for {data.target_role}</p>
          <Progress value={data.readiness_score} className="w-full h-3" />
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{data.recommendation}</p>
        </div>

        {/* Radar chart */}
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 text-center">Skill Coverage</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Radar name="Required" dataKey="required" stroke="#e2e8f0" fill="#e2e8f0" fillOpacity={0.2} />
              <Radar name="Current" dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
              <Tooltip formatter={(v) => [`${v}%`]} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><span className="w-3 h-1 bg-blue-500 rounded block" />Current</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1 bg-slate-300 rounded block" />Required</span>
          </div>
        </div>
      </div>

      {/* Skill breakdown */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Skill Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.skill_gaps.map((gap) => {
            const importance = IMPORTANCE_CONFIG[gap.importance as keyof typeof IMPORTANCE_CONFIG] || IMPORTANCE_CONFIG.important
            return (
              <motion.div
                key={gap.skill}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-2">
                  {gap.have
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />}
                  <span className="text-sm">{gap.skill}</span>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full', importance.bg, importance.color)}>
                  {importance.label}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Recommended courses to fill gaps */}
      {coursesToShow.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Fill Your Gaps</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coursesToShow.flatMap((g) => g.courses_to_fill_gap.slice(0, 1)).map((course) => (
              <CourseCard key={course.id} course={course} onSave={onSave} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
