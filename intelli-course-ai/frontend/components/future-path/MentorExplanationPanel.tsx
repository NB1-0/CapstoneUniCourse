'use client'
import { motion } from 'framer-motion'
import { Brain, TrendingUp, Clock, Star, AlertCircle } from 'lucide-react'
import type { FutureCareerPath } from '@/types'

interface MentorExplanationPanelProps {
  path: FutureCareerPath
}

const RISK_COLOR = { Low: 'text-emerald-400', Medium: 'text-amber-400', High: 'text-red-400' }

const SCORE_LABELS: Record<string, string> = {
  prerequisite_score:      'Prerequisite coverage',
  skill_match_score:       'Required skills match',
  learning_capacity_score: 'Learning capacity',
  difficulty_fit_score:    'Difficulty alignment',
  career_alignment_score:  'Career goal alignment',
  market_relevance_score:  'Market demand',
}

const SCORE_WEIGHTS: Record<string, string> = {
  prerequisite_score:      '25%',
  skill_match_score:       '20%',
  learning_capacity_score: '15%',
  difficulty_fit_score:    '15%',
  career_alignment_score:  '15%',
  market_relevance_score:  '10%',
}

export function MentorExplanationPanel({ path }: MentorExplanationPanelProps) {
  return (
    <motion.div
      key={path.path_id}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-2xl border border-border bg-card/60 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-border bg-gradient-to-r from-violet-500/10 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-violet-400" />
          </div>
          <span className="text-xs font-semibold text-violet-400">AI Mentor Analysis</span>
        </div>
        <h3 className="font-bold text-sm">{path.career_goal}</h3>
        <p className="text-xs text-muted-foreground">{path.path_name}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <div className="p-3 text-center">
          <div className="text-lg font-bold text-primary">{path.success_probability.toFixed(0)}%</div>
          <div className="text-[10px] text-muted-foreground">Success</div>
        </div>
        <div className="p-3 text-center">
          <div className="text-lg font-bold">{path.estimated_months}mo</div>
          <div className="text-[10px] text-muted-foreground">Timeline</div>
        </div>
        <div className="p-3 text-center">
          <div className={`text-lg font-bold ${RISK_COLOR[path.difficulty_risk]}`}>{path.difficulty_risk}</div>
          <div className="text-[10px] text-muted-foreground">Risk</div>
        </div>
      </div>

      {/* Explanation */}
      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">MENTOR INSIGHT</p>
          <p className="text-sm text-foreground/90 leading-relaxed">{path.explanation}</p>
        </div>

        {/* Weighted score breakdown */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-3">SCORING FORMULA</p>
          <div className="space-y-2">
            {Object.entries(path.score_breakdown).map(([key, val]) => {
              const score = val as number
              const color = score >= 75 ? '#10b981' : score >= 50 ? '#3b82f6' : score >= 30 ? '#f59e0b' : '#ef4444'
              return (
                <div key={key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-foreground/80">{SCORE_LABELS[key] ?? key}</span>
                      <span className="text-[9px] text-muted-foreground">×{SCORE_WEIGHTS[key]}</span>
                    </div>
                    <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold tabular-nums" style={{ color }}>{score.toFixed(0)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top missing skills */}
        {path.missing_skills.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> KEY GAPS TO CLOSE
            </p>
            <div className="flex flex-wrap gap-1.5">
              {path.missing_skills.map((s) => (
                <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* First recommended course */}
        {path.recommended_courses[0] && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400" /> BEST FIRST STEP
            </p>
            <p className="text-xs font-semibold">{path.recommended_courses[0].course_name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {path.recommended_courses[0].organization} · {path.recommended_courses[0].difficulty_level}
              {path.recommended_courses[0].rating ? ` · ★ ${path.recommended_courses[0].rating.toFixed(1)}` : ''}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
