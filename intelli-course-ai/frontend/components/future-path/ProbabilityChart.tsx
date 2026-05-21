'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { useState } from 'react'
import type { FutureCareerPath } from '@/types'

interface ProbabilityChartProps {
  paths: FutureCareerPath[]
  selectedPath?: FutureCareerPath | null
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444']

function SuccessBarChart({ paths }: { paths: FutureCareerPath[] }) {
  const data = paths.map((p, i) => ({
    name: p.career_goal.replace(' Engineer', ' Eng.').replace(' Scientist', ' Sci.'),
    probability: p.success_probability,
    months: p.estimated_months,
    color: COLORS[i % COLORS.length],
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: 12,
          }}
          formatter={(v: number) => [`${v.toFixed(1)}%`, 'Success Probability']}
        />
        <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function ScoreRadarChart({ path }: { path: FutureCareerPath }) {
  const data = [
    { subject: 'Prerequisites', value: path.score_breakdown.prerequisite_score },
    { subject: 'Skill Match',   value: path.score_breakdown.skill_match_score },
    { subject: 'Capacity',      value: path.score_breakdown.learning_capacity_score },
    { subject: 'Difficulty Fit',value: path.score_breakdown.difficulty_fit_score },
    { subject: 'Alignment',     value: path.score_breakdown.career_alignment_score },
    { subject: 'Market',        value: path.score_breakdown.market_relevance_score },
  ]

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
        <Radar
          name={path.career_goal}
          dataKey="value"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.25}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export function ProbabilityChart({ paths, selectedPath }: ProbabilityChartProps) {
  const [tab, setTab] = useState<'bar' | 'radar'>('bar')

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">Career Probability Analysis</h3>
          <p className="text-xs text-muted-foreground">
            {tab === 'bar' ? 'Success probability across all paths' : `Score breakdown for ${selectedPath?.career_goal ?? 'selected path'}`}
          </p>
        </div>
        <div className="flex gap-1 p-0.5 rounded-lg bg-muted">
          {[['bar', 'Compare'], ['radar', 'Deep Dive']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v as 'bar' | 'radar')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${tab === v ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === 'bar'
        ? <SuccessBarChart paths={paths} />
        : selectedPath
          ? <ScoreRadarChart path={selectedPath} />
          : <p className="text-xs text-muted-foreground text-center py-8">Select a career path to see its score radar.</p>
      }
    </div>
  )
}
