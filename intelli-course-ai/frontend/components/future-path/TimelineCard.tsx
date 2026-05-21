'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Clock, Target, Zap, AlertTriangle, CheckCircle2, BookOpen, TrendingUp } from 'lucide-react'
import type { FutureCareerPath } from '@/types'

interface TimelineCardProps {
  path: FutureCareerPath
  rank: number
  isSelected: boolean
  onSelect: () => void
}

const RISK_CONFIG = {
  Low:    { color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', icon: CheckCircle2 },
  Medium: { color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30',     icon: AlertTriangle },
  High:   { color: 'text-red-400',     bg: 'bg-red-500/15 border-red-500/30',         icon: AlertTriangle },
}

const TIMELINE_GRADIENT = {
  'Conservative Path': 'from-emerald-600/20 to-emerald-500/5 border-emerald-500/20',
  'Balanced Path':     'from-blue-600/20 to-blue-500/5 border-blue-500/20',
  'Aggressive Path':   'from-orange-600/20 to-orange-500/5 border-orange-500/20',
  'Experimental Path': 'from-purple-600/20 to-purple-500/5 border-purple-500/20',
}

const TIMELINE_BADGE = {
  'Conservative Path': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Balanced Path':     'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Aggressive Path':   'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'Experimental Path': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

function ProbabilityRing({ value }: { value: number }) {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = value >= 75 ? '#10b981' : value >= 55 ? '#3b82f6' : value >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
        <circle
          cx="32" cy="32" r={radius}
          fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{value.toFixed(0)}%</span>
      </div>
    </div>
  )
}

export function TimelineCard({ path, rank, isSelected, onSelect }: TimelineCardProps) {
  const [expanded, setExpanded] = useState(false)
  const risk = RISK_CONFIG[path.difficulty_risk] ?? RISK_CONFIG.Medium
  const RiskIcon = risk.icon
  const gradientClass = TIMELINE_GRADIENT[path.timeline_type as keyof typeof TIMELINE_GRADIENT] ?? 'from-card to-card border-border'
  const badgeClass = TIMELINE_BADGE[path.timeline_type as keyof typeof TIMELINE_BADGE] ?? 'bg-muted text-muted-foreground border-border'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      onClick={onSelect}
      className={`relative rounded-2xl border bg-gradient-to-br ${gradientClass} cursor-pointer transition-all duration-200
        ${isSelected ? 'ring-2 ring-primary/60 shadow-lg shadow-primary/10' : 'hover:shadow-md'}`}
    >
      {rank === 0 && (
        <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-[10px] font-bold text-black shadow">
          BEST MATCH
        </div>
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                {path.timeline_type}
              </span>
            </div>
            <h3 className="font-bold text-base leading-tight">{path.career_goal}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{path.path_name}</p>
          </div>
          <ProbabilityRing value={path.success_probability} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <Clock className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
            <div className="text-sm font-bold">{path.estimated_months}mo</div>
            <div className="text-[10px] text-muted-foreground">Timeline</div>
          </div>
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <Target className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
            <div className="text-sm font-bold">{path.readiness_score.toFixed(0)}%</div>
            <div className="text-[10px] text-muted-foreground">Readiness</div>
          </div>
          <div className={`rounded-lg p-2 text-center border ${risk.bg}`}>
            <RiskIcon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${risk.color}`} />
            <div className={`text-sm font-bold ${risk.color}`}>{path.difficulty_risk}</div>
            <div className="text-[10px] text-muted-foreground">Risk</div>
          </div>
        </div>

        {/* Missing skills */}
        {path.missing_skills.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">SKILL GAPS</p>
            <div className="flex flex-wrap gap-1">
              {path.missing_skills.slice(0, 4).map((s) => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  {s}
                </span>
              ))}
              {path.missing_skills.length > 4 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  +{path.missing_skills.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Top recommended course */}
        {path.recommended_courses[0] && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
            <BookOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Start with</p>
              <p className="text-xs font-medium truncate">{path.recommended_courses[0].course_name}</p>
            </div>
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
          className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Hide roadmap</> : <><ChevronDown className="w-3 h-3" /> View roadmap</>}
        </button>
      </div>

      {/* Expanded roadmap */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-4 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground mb-2">LEARNING ROADMAP</p>
              {path.roadmap_steps.map((step) => (
                <div key={step.step} className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-primary">{step.step}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">{step.skill}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">{step.estimated_weeks}w</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{step.course_name}</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                    {step.phase}
                  </span>
                </div>
              ))}
            </div>

            {/* Score breakdown */}
            <div className="px-4 pb-4">
              <p className="text-[10px] font-semibold text-muted-foreground mb-2">SCORE BREAKDOWN</p>
              <div className="space-y-1.5">
                {Object.entries(path.score_breakdown).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-36 truncate capitalize">
                      {k.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${v}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{(v as number).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
