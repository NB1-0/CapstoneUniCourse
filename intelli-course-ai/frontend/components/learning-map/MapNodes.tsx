'use client'
import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Star, BookOpen, Clock, CheckCircle2, Lock, Zap, Target, ExternalLink, Award } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Domain colour palette ────────────────────────────────────────────────────

export const DOMAIN_PALETTE: Record<string, { border: string; glow: string; bg: string; text: string }> = {
  'Programming':              { border: '#10b981', glow: '#10b98133', bg: '#10b98108', text: '#10b981' },
  'Data Science':             { border: '#3b82f6', glow: '#3b82f633', bg: '#3b82f608', text: '#3b82f6' },
  'Machine Learning':         { border: '#8b5cf6', glow: '#8b5cf633', bg: '#8b5cf608', text: '#8b5cf6' },
  'Deep Learning':            { border: '#7c3aed', glow: '#7c3aed33', bg: '#7c3aed08', text: '#7c3aed' },
  'Natural Language Processing': { border: '#ec4899', glow: '#ec489933', bg: '#ec489908', text: '#ec4899' },
  'Computer Vision':          { border: '#f43f5e', glow: '#f43f5e33', bg: '#f43f5e08', text: '#f43f5e' },
  'Cloud':                    { border: '#f97316', glow: '#f9731633', bg: '#f9731608', text: '#f97316' },
  'Database':                 { border: '#f59e0b', glow: '#f59e0b33', bg: '#f59e0b08', text: '#f59e0b' },
  'Web Development':          { border: '#06b6d4', glow: '#06b6d433', bg: '#06b6d408', text: '#06b6d4' },
  'DevOps':                   { border: '#ef4444', glow: '#ef444433', bg: '#ef444408', text: '#ef4444' },
  'Statistics':               { border: '#14b8a6', glow: '#14b8a633', bg: '#14b8a608', text: '#14b8a6' },
  'default':                  { border: '#64748b', glow: '#64748b33', bg: '#64748b08', text: '#94a3b8' },
}

function palette(domain?: string) {
  return DOMAIN_PALETTE[domain ?? ''] ?? DOMAIN_PALETTE.default
}

// ── Skill Node ───────────────────────────────────────────────────────────────

export interface SkillNodeData {
  label: string
  domain?: string
  level?: string
  courses?: number
  weeks?: number
  completed?: boolean
  inProgress?: boolean
  locked?: boolean
  relType?: string
  importance?: 'critical' | 'important' | 'nice-to-have'
  prerequisiteOf?: string
}

export const SkillNode = memo(function SkillNode({ data, selected }: NodeProps<SkillNodeData>) {
  const c = palette(data.domain)
  const borderColor = data.completed ? '#10b981' : data.locked ? '#334155' : c.border
  const bgColor     = data.completed ? '#10b98110' : data.locked ? 'transparent' : c.bg

  return (
    <div
      className={cn(
        'rounded-2xl border-2 bg-[#0f172a] shadow-2xl w-[230px] overflow-hidden transition-all duration-200 cursor-pointer select-none',
        selected && 'ring-2 ring-offset-2 ring-offset-[#0f172a]',
        data.locked && 'opacity-50',
      )}
      style={{
        borderColor,
        background: bgColor,
        boxShadow: selected
          ? `0 0 0 2px ${borderColor}, 0 0 24px ${c.glow}`
          : `0 4px 24px rgba(0,0,0,0.4)`,
        ...(selected ? { '--tw-ring-color': borderColor } as React.CSSProperties : {}),
      }}
    >
      {/* Top handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: borderColor, border: '2.5px solid #0f172a', width: 12, height: 12, top: -6 }}
      />

      {/* Gradient accent bar */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${borderColor}, ${borderColor}44)` }}
      />

      <div className="px-4 py-3 space-y-2">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-bold text-sm text-white leading-snug flex-1">{data.label}</span>
          {data.completed && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
          {data.locked   && <Lock         className="w-4 h-4 text-slate-500  flex-shrink-0 mt-0.5" />}
          {data.inProgress && !data.completed && (
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          {data.courses != null && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" style={{ color: c.text }} />
              {data.courses} course{data.courses !== 1 ? 's' : ''}
            </span>
          )}
          {data.weeks != null && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />~{data.weeks}w
            </span>
          )}
        </div>

        {/* Domain + level badges */}
        <div className="flex flex-wrap gap-1.5">
          {data.domain && (
            <span
              className="text-[10px] px-2 py-px rounded-full font-semibold border"
              style={{ color: c.text, borderColor: `${borderColor}60`, background: `${borderColor}15` }}
            >
              {data.domain}
            </span>
          )}
          {data.level && (
            <span className="text-[10px] px-2 py-px rounded-full font-medium bg-white/5 text-slate-400 border border-white/10">
              {data.level}
            </span>
          )}
          {data.importance === 'critical' && (
            <span className="text-[10px] px-2 py-px rounded-full font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
              critical
            </span>
          )}
        </div>
      </div>

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: borderColor, border: '2.5px solid #0f172a', width: 12, height: 12, bottom: -6 }}
      />
    </div>
  )
})

// ── Course Node ──────────────────────────────────────────────────────────────

export interface CourseNodeData {
  id: string
  course_name: string
  organization: string
  rating: number
  difficulty_level: string
  course_url?: string
  skills?: string[]
  why?: string
}

export const CourseNode = memo(function CourseNode({ data, selected }: NodeProps<CourseNodeData>) {
  const diffColor: Record<string, string> = {
    Beginner: '#10b981', Intermediate: '#3b82f6', Advanced: '#8b5cf6', Mixed: '#64748b',
  }
  const dc = diffColor[data.difficulty_level] ?? '#64748b'

  return (
    <div
      className={cn(
        'rounded-2xl border bg-[#0f172a] shadow-2xl w-[210px] overflow-hidden cursor-pointer select-none transition-all duration-200',
        selected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0f172a]',
      )}
      style={{
        borderColor: selected ? '#3b82f6' : '#1e3a5f',
        boxShadow: selected ? '0 0 0 2px #3b82f6, 0 0 20px #3b82f620' : '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#3b82f6', border: '2.5px solid #0f172a', width: 10, height: 10, top: -5 }}
      />

      {/* Blue header strip */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-blue-500/30" />

      <div className="px-3.5 py-3 space-y-2">
        {/* Book icon + name */}
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-xs font-semibold text-white leading-snug line-clamp-2">{data.course_name}</span>
        </div>

        {/* Org + rating */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 truncate flex-1">{data.organization}</span>
          {data.rating > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-amber-400 flex-shrink-0 ml-2">
              <Star className="w-2.5 h-2.5 fill-current" />
              {data.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Difficulty + link */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] px-2 py-px rounded-full font-semibold border"
            style={{ color: dc, borderColor: `${dc}50`, background: `${dc}15` }}
          >
            {data.difficulty_level}
          </span>
          {data.course_url && (
            <a
              href={data.course_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Skills taught */}
        {data.skills && data.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {data.skills.slice(0, 3).map((s) => (
              <span key={s} className="text-[9px] px-1.5 py-px rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#3b82f6', border: '2.5px solid #0f172a', width: 10, height: 10, bottom: -5 }}
      />
    </div>
  )
})

// ── Career Node ──────────────────────────────────────────────────────────────

export interface CareerNodeData {
  title: string
  readiness?: number
  requiredCount?: number
  missingCount?: number
  description?: string
}

export const CareerNode = memo(function CareerNode({ data, selected }: NodeProps<CareerNodeData>) {
  const pct = data.readiness ?? 0
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'
  const circumference = 2 * Math.PI * 18

  return (
    <div
      className={cn(
        'rounded-2xl border-2 bg-[#0f172a] shadow-2xl w-[250px] overflow-hidden cursor-pointer select-none transition-all duration-200',
        selected && 'ring-2 ring-offset-2 ring-offset-[#0f172a] ring-amber-500',
      )}
      style={{
        borderColor: selected ? '#f59e0b' : '#44330a',
        background: 'linear-gradient(135deg, #1c1204 0%, #0f172a 60%)',
        boxShadow: selected ? '0 0 0 2px #f59e0b, 0 0 30px #f59e0b30' : '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#f59e0b', border: '2.5px solid #0f172a', width: 12, height: 12, top: -6 }}
      />

      {/* Amber header */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-amber-500/20" />

      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          {/* Readiness gauge */}
          {data.readiness != null && (
            <div className="relative flex-shrink-0 w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#1e293b" strokeWidth="4" />
                <circle
                  cx="22" cy="22" r="18" fill="none"
                  stroke={color} strokeWidth="4"
                  strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* CAREER label */}
            <div className="text-[9px] font-bold tracking-widest text-amber-500/70 uppercase mb-0.5">Career Goal</div>
            <div className="font-bold text-sm text-white leading-snug">{data.title}</div>
            {data.requiredCount != null && (
              <div className="text-[11px] text-slate-400 mt-1.5">
                <span className="text-emerald-400 font-semibold">
                  {(data.requiredCount ?? 0) - (data.missingCount ?? 0)} owned
                </span>
                {' · '}
                <span className="text-red-400 font-semibold">
                  {data.missingCount} missing
                </span>
                {' of '}
                {data.requiredCount} skills
              </div>
            )}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#f59e0b', border: '2.5px solid #0f172a', width: 12, height: 12, bottom: -6 }}
      />
    </div>
  )
})

// ── Domain Group Node ────────────────────────────────────────────────────────

export interface DomainNodeData {
  label: string
  skillCount?: number
}

export const DomainNode = memo(function DomainNode({ data, selected }: NodeProps<DomainNodeData>) {
  const c = palette(data.label)
  return (
    <div
      className="rounded-2xl border px-5 py-3 cursor-default select-none"
      style={{
        borderColor: `${c.border}50`,
        background: `linear-gradient(135deg, ${c.bg} 0%, transparent 80%)`,
        boxShadow: selected ? `0 0 20px ${c.glow}` : 'none',
      }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: c.border }} />
        <span className="text-xs font-bold tracking-wide" style={{ color: c.text }}>{data.label}</span>
        {data.skillCount != null && (
          <span className="text-[10px] text-slate-500 ml-1">{data.skillCount} skills</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  )
})

// ── Milestone Node (start / end marker) ─────────────────────────────────────

export interface MilestoneNodeData {
  label: string
  variant: 'start' | 'end' | 'checkpoint'
}

export const MilestoneNode = memo(function MilestoneNode({ data, selected }: NodeProps<MilestoneNodeData>) {
  const colors = {
    start:      { bg: '#10b98120', border: '#10b981', text: '#10b981', icon: '▶' },
    end:        { bg: '#8b5cf620', border: '#8b5cf6', text: '#8b5cf6', icon: '🏆' },
    checkpoint: { bg: '#f59e0b20', border: '#f59e0b', text: '#f59e0b', icon: '◆' },
  }
  const c = colors[data.variant]

  return (
    <div
      className="rounded-full px-5 py-2 border-2 flex items-center gap-2 cursor-default select-none"
      style={{
        borderColor: c.border,
        background: c.bg,
        boxShadow: selected ? `0 0 20px ${c.border}44` : '0 2px 12px rgba(0,0,0,0.4)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: c.border, border: '2px solid #0f172a', width: 10, height: 10, top: -5 }} />
      <span className="text-sm">{c.icon}</span>
      <span className="text-xs font-bold tracking-wide" style={{ color: c.text }}>{data.label}</span>
      <Handle type="source" position={Position.Bottom} style={{ background: c.border, border: '2px solid #0f172a', width: 10, height: 10, bottom: -5 }} />
    </div>
  )
})

// ── Export node type map ─────────────────────────────────────────────────────

export const NODE_TYPES = {
  skillNode:     SkillNode,
  courseNode:    CourseNode,
  careerNode:    CareerNode,
  domainNode:    DomainNode,
  milestoneNode: MilestoneNode,
}
