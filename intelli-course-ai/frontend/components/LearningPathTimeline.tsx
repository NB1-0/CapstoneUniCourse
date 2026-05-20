'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, Play } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getPhaseColor, cn } from '@/lib/utils'
import type { LearningPathResponse, LearningPathStep } from '@/types'

interface LearningPathTimelineProps {
  data: LearningPathResponse | null
  isLoading?: boolean
}

function StepCard({ step, index }: { step: LearningPathStep; index: number }) {
  const [open, setOpen] = useState(index === 0)
  const phaseColor = getPhaseColor(step.phase)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex gap-4"
    >
      {/* Timeline line + circle */}
      <div className="flex flex-col items-center">
        <div className={cn('w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 bg-card', phaseColor)}>
          {step.order}
        </div>
        <div className="w-0.5 flex-1 bg-border mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border capitalize', phaseColor)}>{step.phase}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />{step.estimated_duration}
              </span>
            </div>
            <h3 className="font-semibold text-sm leading-snug">{step.course.course_name}</h3>
            <p className="text-xs text-muted-foreground">{step.course.organization} · ★ {step.course.rating.toFixed(1)}</p>
          </div>
          <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground transition-colors">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{step.reason}</p>
            <div className="mb-2">
              <p className="text-xs font-medium mb-1.5">Skills you&apos;ll gain:</p>
              <div className="flex flex-wrap gap-1.5">
                {step.skills_gained.map((s) => (
                  <span key={s} className="skill-badge">{s}</span>
                ))}
              </div>
            </div>
            {!step.prerequisites_met && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                ⚠ Complete earlier courses before starting this one
              </p>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export function LearningPathTimeline({ data, isLoading }: LearningPathTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!data) return null

  if (data.total_steps === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium">No learning path found</p>
        <p className="text-xs text-muted-foreground mt-1">Try a different goal or skill level</p>
      </div>
    )
  }

  const phases = Array.from(new Set(data.path.map((s) => s.phase)))

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 rounded-xl glass-card border">
        <p className="text-sm font-medium mb-1">🎯 {data.goal}</p>
        <p className="text-xs text-muted-foreground">{data.summary}</p>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span>📚 {data.total_steps} courses</span>
          <span>⏱ {data.estimated_total_duration}</span>
          <span>🎓 {phases.join(' → ')}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {data.path.map((step, i) => (
          <StepCard key={step.order} step={step} index={i} />
        ))}
        {/* End marker */}
        <div className="flex gap-4 items-center">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm font-medium gradient-text">Goal Achieved!</p>
        </div>
      </div>
    </div>
  )
}
