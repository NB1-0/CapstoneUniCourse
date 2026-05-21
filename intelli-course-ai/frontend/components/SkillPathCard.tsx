'use client'
import { motion } from 'framer-motion'
import { Star, Clock, ArrowRight, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import type { SkillStep } from '@/types'

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: 'text-emerald-400 bg-emerald-400/10',
  Intermediate: 'text-blue-400 bg-blue-400/10',
  Advanced: 'text-purple-400 bg-purple-400/10',
  Mixed: 'text-slate-400 bg-slate-400/10',
}

const REL_LABELS: Record<string, string> = {
  ADVANCES_TO: 'advances to',
  LEADS_TO: 'leads to',
  RELATED_TO: 'related to',
}

interface Props {
  steps: SkillStep[]
  fromSkill: string
  toSkill: string
  totalWeeks: number
}

export function SkillPathCard({ steps, fromSkill, toSkill, totalWeeks }: Props) {
  return (
    <div className="space-y-0">
      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
        <div className="text-sm font-medium text-white/90">
          <span className="text-blue-400 font-semibold">{fromSkill}</span>
          <ArrowRight className="inline w-4 h-4 mx-2 text-white/40" />
          <span className="text-purple-400 font-semibold">{toSkill}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-white/50">
          <Clock className="w-3.5 h-3.5" />
          ~{totalWeeks} weeks total
        </div>
      </div>

      {/* Steps */}
      <div className="relative">
        {/* Connector line */}
        <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-emerald-500/50 via-blue-500/50 to-purple-500/50" />

        <div className="space-y-3">
          {steps.map((step, i) => (
            <SkillStepRow key={step.skill} step={step} index={i} total={steps.length} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SkillStepRow({ step, index, total }: { step: SkillStep; index: number; total: number }) {
  const [expanded, setExpanded] = useState(false)
  const pct = Math.round(((index + 1) / total) * 100)
  const isLast = index === total - 1

  const dotColor = index === 0
    ? 'bg-emerald-500 shadow-emerald-500/50'
    : isLast
    ? 'bg-purple-500 shadow-purple-500/50'
    : 'bg-blue-500 shadow-blue-500/50'

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative pl-14"
    >
      {/* Step dot */}
      <div className={`absolute left-4 top-4 w-5 h-5 rounded-full border-2 border-background shadow-lg ${dotColor} z-10`} />
      {/* Relation label above */}
      {step.rel_type && index > 0 && (
        <div className="text-[10px] text-white/30 mb-1 font-medium uppercase tracking-wide">
          {REL_LABELS[step.rel_type] ?? step.rel_type.toLowerCase().replace('_', ' ')}
        </div>
      )}

      <div className="rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors overflow-hidden">
        <button
          className="w-full flex items-center gap-3 p-3.5 text-left"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Step number */}
          <span className="text-[10px] font-bold text-white/30 w-5 text-center">{index + 1}</span>

          {/* Skill name */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white/90 text-sm">{step.skill}</div>
            <div className="text-xs text-white/40 mt-0.5">
              {step.courses.length} course{step.courses.length !== 1 ? 's' : ''} available · ~{step.estimated_weeks}w
            </div>
          </div>

          {/* Progress chip */}
          <div className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
            {pct}%
          </div>

          {/* Expand */}
          {step.courses.length > 0 && (
            expanded ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />
          )}
        </button>

        {/* Courses */}
        {expanded && step.courses.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/6 divide-y divide-white/6"
          >
            {step.courses.map((c) => (
              <div key={c.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white/80 truncate">{c.course_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-white/40">{c.organization}</span>
                    <span className={`text-[10px] px-1.5 py-px rounded-full font-medium ${DIFFICULTY_COLORS[c.difficulty_level] ?? DIFFICULTY_COLORS.Mixed}`}>
                      {c.difficulty_level}
                    </span>
                    {c.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        {c.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                {c.course_url && (
                  <a
                    href={c.course_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-blue-400 hover:text-blue-300 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
