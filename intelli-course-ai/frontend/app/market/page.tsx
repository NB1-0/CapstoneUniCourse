'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Zap, Briefcase, Cpu, Star, ExternalLink,
  ArrowUpRight, ChevronRight, Wifi, Globe, Shield, Database,
  Code2, Cloud, BarChart2, Flame, Clock, DollarSign, Users,
  Filter, BookOpen, AlertCircle,
} from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { Navbar } from '@/components/Navbar'
import { api } from '@/lib/api'
import type { TrendingSkill, CareerDemand, EmergingTech, MarketSummary, SkillInsight } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  'AI/ML':      { color: 'text-purple-400',  icon: Cpu },
  'Cloud':      { color: 'text-blue-400',    icon: Cloud },
  'Web':        { color: 'text-cyan-400',    icon: Globe },
  'Security':   { color: 'text-red-400',     icon: Shield },
  'Data':       { color: 'text-orange-400',  icon: Database },
  'DevOps':     { color: 'text-green-400',   icon: Wifi },
  'Languages':  { color: 'text-indigo-400',  icon: Code2 },
  'Systems':    { color: 'text-slate-400',   icon: BarChart2 },
  'Management': { color: 'text-yellow-400',  icon: Users },
  'Engineering':{ color: 'text-blue-400',    icon: Code2 },
}

const DEMAND_META: Record<string, { bg: string; text: string; border: string }> = {
  Critical: { bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30' },
  High:     { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  Growing:  { bg: 'bg-green-500/15',  text: 'text-green-400',  border: 'border-green-500/30' },
  Stable:   { bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/30' },
}

const ADOPTION_META: Record<string, { bg: string; text: string }> = {
  'Early Adopter': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  'Growing':       { bg: 'bg-blue-500/20',   text: 'text-blue-400' },
  'Mainstream':    { bg: 'bg-green-500/20',  text: 'text-green-400' },
}

function growthColor(rate: number) {
  if (rate >= 200) return 'text-rose-400'
  if (rate >= 100) return 'text-orange-400'
  if (rate >= 50)  return 'text-yellow-400'
  return 'text-green-400'
}

function growthBarColor(rate: number) {
  if (rate >= 200) return 'from-rose-500 to-pink-400'
  if (rate >= 100) return 'from-orange-500 to-amber-400'
  if (rate >= 50)  return 'from-yellow-500 to-lime-400'
  return 'from-green-500 to-emerald-400'
}

function formatSalary(n: number) {
  return `$${(n / 1000).toFixed(0)}k`
}

function formatGrowth(rate: number) {
  return `+${rate.toFixed(0)}%`
}

const ALL_SKILL_CATEGORIES = ['All', 'AI/ML', 'Cloud', 'Web', 'Security', 'Data', 'DevOps', 'Languages']
const ALL_DEMAND_LEVELS    = ['All', 'Critical', 'High', 'Growing', 'Stable']
const ALL_TECH_CATEGORIES  = ['All', 'AI/ML', 'Cloud', 'Web', 'DevOps', 'Data', 'Systems']

// ── Subcomponents ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string
  icon: React.ComponentType<{ className?: string }>; accent: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 flex items-start gap-3"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-bold text-base leading-tight truncate">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}

// Animated horizontal bar chart for trending skills
function DemandBar({ score, growth, animated }: { score: number; growth: number; animated: boolean }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: animated ? `${score}%` : 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${growthBarColor(growth)}`}
        />
      </div>
      <span className="text-xs font-semibold text-foreground w-8 text-right">{score}</span>
    </div>
  )
}

function SkillCard({
  skill, onSelect, selected,
}: { skill: TrendingSkill; onSelect: (s: TrendingSkill) => void; selected: boolean }) {
  const catMeta = CATEGORY_META[skill.category] ?? CATEGORY_META['AI/ML']
  const CatIcon = catMeta.icon
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onSelect(skill)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected
          ? 'border-primary/60 bg-primary/5 shadow-md'
          : 'border-border bg-card hover:border-border/80 hover:bg-accent/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <CatIcon className={`w-3.5 h-3.5 flex-shrink-0 ${catMeta.color}`} />
          <span className="font-semibold text-sm truncate">{skill.skill}</span>
          {skill.is_emerging && (
            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 uppercase tracking-wide">
              Emerging
            </span>
          )}
        </div>
        <span className={`text-xs font-bold flex-shrink-0 ${growthColor(skill.growth_rate)}`}>
          {formatGrowth(skill.growth_rate)}
        </span>
      </div>

      <DemandBar score={skill.demand_score} growth={skill.growth_rate} animated />

      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <DollarSign className="w-2.5 h-2.5" />
          {formatSalary(skill.avg_salary)}/yr
        </span>
        <span className="flex items-center gap-0.5">
          <Briefcase className="w-2.5 h-2.5" />
          {(skill.job_postings / 1000).toFixed(0)}k jobs
        </span>
        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
          skill.difficulty === 'Beginner' ? 'bg-green-500/15 text-green-400'
          : skill.difficulty === 'Intermediate' ? 'bg-yellow-500/15 text-yellow-400'
          : 'bg-red-500/15 text-red-400'
        }`}>{skill.difficulty}</span>
      </div>
    </motion.button>
  )
}

function SkillInsightPanel({ insight, onClose }: {
  insight: SkillInsight | null
  onClose: () => void
}) {
  if (!insight) return null
  return (
    <motion.div
      key={insight.skill}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-72 flex-shrink-0 bg-card border border-border rounded-xl p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)]"
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">{insight.skill}</span>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>

      {/* Demand gauge */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Demand Index</span>
          <span className="font-semibold">{insight.demand_score}/100</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${insight.demand_score}%` }}
            transition={{ duration: 0.6 }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
          />
        </div>
      </div>

      <div className="p-3 rounded-lg bg-muted/40 space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Trend</p>
        <p className="text-xs leading-relaxed">{insight.trend_summary}</p>
      </div>

      <div className="p-3 rounded-lg bg-muted/40 space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Market Context</p>
        <p className="text-xs leading-relaxed">{insight.market_context}</p>
      </div>

      <div className="p-3 rounded-lg bg-muted/40 space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Salary Impact</p>
        <p className="text-xs leading-relaxed">{insight.salary_impact}</p>
      </div>

      {insight.career_alignment.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Career Paths</p>
          <div className="space-y-1">
            {insight.career_alignment.map((c) => (
              <div key={c} className="flex items-center gap-1.5 text-xs">
                <ChevronRight className="w-3 h-3 text-primary" />
                {c}
              </div>
            ))}
          </div>
        </div>
      )}

      {insight.recommended_courses.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Top Courses</p>
          <div className="space-y-2">
            {insight.recommended_courses.map((c) => (
              <a
                key={c.id}
                href={c.course_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors group"
              >
                <BookOpen className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{c.course_name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.organization}</p>
                </div>
                {c.course_url && <ExternalLink className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0 mt-0.5" />}
              </a>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function CareerCard({ career }: { career: CareerDemand }) {
  const [expanded, setExpanded] = useState(false)
  const dm = DEMAND_META[career.demand_level] ?? DEMAND_META.Stable
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-border/80 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm">{career.title}</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${dm.bg} ${dm.text} ${dm.border}`}>
              {career.demand_level}
            </span>
            {career.remote_friendly && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                Remote
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{career.category}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-bold ${growthColor(career.growth_rate)}`}>{formatGrowth(career.growth_rate)}</p>
          <p className="text-[10px] text-muted-foreground">YoY growth</p>
        </div>
      </div>

      {/* Salary bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Salary Range</span>
          <span className="font-semibold text-foreground">{formatSalary(career.salary_min)} – {formatSalary(career.salary_max)}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((career.avg_salary / 200_000) * 100, 100)}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
          />
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed">{career.description}</p>

      {/* Required skills */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">Required Skills</p>
        <div className="flex flex-wrap gap-1">
          {career.required_skills.map((s) => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Trending skills toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-[11px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
      >
        <Flame className="w-3 h-3" />
        {expanded ? 'Hide' : 'Show'} trending skills for this role
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1 pt-1">
              {career.trending_skills.map((s) => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1">
                  <ArrowUpRight className="w-2.5 h-2.5" />{s}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function TechCard({ tech }: { tech: EmergingTech }) {
  const am = ADOPTION_META[tech.adoption_stage] ?? ADOPTION_META['Growing']
  const catMeta = CATEGORY_META[tech.category] ?? CATEGORY_META['AI/ML']
  const CatIcon = catMeta.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 space-y-3 flex flex-col hover:border-border/80 transition-colors"
    >
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CatIcon className={`w-4 h-4 flex-shrink-0 ${catMeta.color}`} />
            <h3 className="font-bold text-sm leading-tight">{tech.name}</h3>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${am.bg} ${am.text}`}>
            {tech.adoption_stage}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">{tech.category}</p>
      </div>

      {/* Hype meter */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Adoption Momentum</span>
          <span className="font-semibold">{tech.hype_score}/100</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${tech.hype_score}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full bg-gradient-to-r ${
              tech.hype_score >= 85 ? 'from-purple-500 to-pink-500'
              : tech.hype_score >= 70 ? 'from-blue-500 to-cyan-500'
              : 'from-green-500 to-teal-500'
            }`}
          />
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed flex-1">{tech.description}</p>

      {/* Use cases */}
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">Use Cases</p>
        <ul className="space-y-0.5">
          {tech.use_cases.slice(0, 3).map((u) => (
            <li key={u} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <span className="text-primary mt-0.5">•</span>{u}
            </li>
          ))}
        </ul>
      </div>

      {/* Recommended skills */}
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">Recommended Skills</p>
        <div className="flex flex-wrap gap-1">
          {tech.recommended_skills.slice(0, 4).map((s) => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{tech.market_size}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tech.timeline}</span>
      </div>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'skills' | 'careers' | 'emerging'

export default function MarketPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [tab, setTab] = useState<Tab>('skills')
  const [summary, setSummary] = useState<MarketSummary | null>(null)

  // Trending skills state
  const [skills, setSkills] = useState<TrendingSkill[]>([])
  const [skillCategory, setSkillCategory] = useState('All')
  const [selectedSkill, setSelectedSkill] = useState<TrendingSkill | null>(null)
  const [skillInsight, setSkillInsight] = useState<SkillInsight | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  // Careers state
  const [careers, setCareers] = useState<CareerDemand[]>([])
  const [demandFilter, setDemandFilter] = useState('All')

  // Emerging tech state
  const [techs, setTechs] = useState<EmergingTech[]>([])
  const [techCategory, setTechCategory] = useState('All')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load summary + initial skills
  useEffect(() => {
    async function init() {
      try {
        const [sum, sk] = await Promise.all([
          api.marketSummary(),
          api.trendingSkills({ limit: 20 }),
        ])
        setSummary(sum)
        setSkills(sk)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load market data')
      }
    }
    init()
  }, [])

  // Load careers when tab changes
  useEffect(() => {
    if (tab === 'careers' && careers.length === 0) {
      api.careerDemand().then(setCareers).catch(() => {})
    }
  }, [tab, careers.length])

  // Load emerging tech when tab changes
  useEffect(() => {
    if (tab === 'emerging' && techs.length === 0) {
      api.emergingTech().then(setTechs).catch(() => {})
    }
  }, [tab, techs.length])

  // Re-fetch skills when category changes
  useEffect(() => {
    setLoading(true)
    api.trendingSkills({ category: skillCategory === 'All' ? undefined : skillCategory, limit: 20 })
      .then(setSkills)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [skillCategory])

  // Load insight when a skill is selected
  const handleSelectSkill = useCallback(async (s: TrendingSkill) => {
    if (selectedSkill?.skill === s.skill) {
      setSelectedSkill(null)
      setSkillInsight(null)
      return
    }
    setSelectedSkill(s)
    setInsightLoading(true)
    try {
      const insight = await api.skillInsight(s.skill)
      setSkillInsight(insight)
    } catch {
      setSkillInsight(null)
    } finally {
      setInsightLoading(false)
    }
  }, [selectedSkill])

  const filteredCareers = demandFilter === 'All'
    ? careers
    : careers.filter((c) => c.demand_level === demandFilter)

  const filteredTechs = techCategory === 'All'
    ? techs
    : techs.filter((t) => t.category === techCategory)

  const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'skills',   label: 'Trending Skills',   icon: TrendingUp },
    { id: 'careers',  label: 'Career Demand',      icon: Briefcase },
    { id: 'emerging', label: 'Emerging Tech',      icon: Zap },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-transparent border-b border-border px-6 py-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Market Trend Intelligence
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  AI-driven insights into skill demand, career growth, and emerging technology
                </p>
              </div>
              {summary && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-1.5">
                  <Clock className="w-3 h-3" />
                  Updated {summary.last_updated}
                </div>
              )}
            </div>

            {/* Summary stats */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <StatCard label="Total Skills Tracked" value={`${summary.total_skills_tracked}`}
                  icon={BarChart2} accent="bg-blue-500" />
                <StatCard label="Fastest Growing Skill" value={summary.fastest_growing}
                  sub={`+${summary.fastest_growth_rate.toFixed(0)}% YoY`} icon={Flame} accent="bg-rose-500" />
                <StatCard label="Hottest Career" value={summary.hottest_career}
                  icon={Briefcase} accent="bg-purple-500" />
                <StatCard label="Top Emerging Tech" value={summary.top_emerging_tech}
                  icon={Zap} accent="bg-orange-500" />
              </div>
            )}
          </div>

          {/* Tab navigation */}
          <div className="px-6 border-b border-border bg-card/50">
            <div className="flex gap-0">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    tab === id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {tab === id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error} — showing cached data.
            </div>
          )}

          {/* ── Tab: Trending Skills ── */}
          {tab === 'skills' && (
            <div className="p-6 space-y-4">
              {/* Category filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                {ALL_SKILL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSkillCategory(cat)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      skillCategory === cat
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                {/* Skills grid */}
                <div className={`flex-1 grid gap-3 ${selectedSkill ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
                    ))
                  ) : (
                    skills.map((s) => (
                      <SkillCard
                        key={s.skill}
                        skill={s}
                        selected={selectedSkill?.skill === s.skill}
                        onSelect={handleSelectSkill}
                      />
                    ))
                  )}
                </div>

                {/* Insight panel */}
                <AnimatePresence>
                  {selectedSkill && (
                    insightLoading ? (
                      <div className="w-72 flex-shrink-0 bg-card border border-border rounded-xl p-4 flex items-center justify-center h-48">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <SkillInsightPanel
                        insight={skillInsight}
                        onClose={() => { setSelectedSkill(null); setSkillInsight(null) }}
                      />
                    )
                  )}
                </AnimatePresence>
              </div>

              {/* Growth spotlight callout */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-2 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-3"
              >
                <Flame className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-400">Demand for Generative AI Engineers increased significantly</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    LangChain, RAG Systems, and Vector Databases are the three fastest-rising skills employers are requiring.
                    Average salaries for GenAI roles jumped 22% in the past 12 months — now reaching $130k–$210k.
                  </p>
                  <div className="flex gap-2 mt-2">
                    {['LangChain', 'RAG Systems', 'Vector Databases'].map((s) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* ── Tab: Career Demand ── */}
          {tab === 'careers' && (
            <div className="p-6 space-y-4">
              {/* Demand level filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                {ALL_DEMAND_LEVELS.map((level) => {
                  const dm = DEMAND_META[level]
                  return (
                    <button
                      key={level}
                      onClick={() => setDemandFilter(level)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        demandFilter === level
                          ? dm
                            ? `${dm.bg} ${dm.text} ${dm.border}`
                            : 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                      }`}
                    >
                      {level}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-3 flex-wrap text-[11px] text-muted-foreground">
                {Object.entries(DEMAND_META).map(([level, dm]) => (
                  <span key={level} className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${dm.bg} ${dm.text}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />{level}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {careers.length === 0 ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
                  ))
                ) : (
                  filteredCareers.map((c) => <CareerCard key={c.title} career={c} />)
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Emerging Tech ── */}
          {tab === 'emerging' && (
            <div className="p-6 space-y-4">
              {/* Category filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                {ALL_TECH_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setTechCategory(cat)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      techCategory === cat
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Adoption stage legend */}
              <div className="flex gap-3 flex-wrap text-[11px]">
                {Object.entries(ADOPTION_META).map(([stage, am]) => (
                  <span key={stage} className={`px-2 py-0.5 rounded-full font-medium ${am.bg} ${am.text}`}>{stage}</span>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {techs.length === 0 ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />
                  ))
                ) : (
                  filteredTechs.map((t) => <TechCard key={t.name} tech={t} />)
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
