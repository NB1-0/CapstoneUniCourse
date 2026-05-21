'use client'
import { useState, useCallback, useMemo, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { ReactFlowProvider, type Node, type Edge, MarkerType } from 'reactflow'
import {
  Map, TrendingUp, Briefcase, GitBranch, ArrowRight,
  Search, RefreshCw, X, Star, ExternalLink, BookOpen,
  ChevronRight, Zap, Clock, Target, Brain, Lock, CheckCircle2,
  Layers, AlertCircle, BarChart3,
} from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { Navbar } from '@/components/Navbar'
import { api } from '@/lib/api'
import { getLayoutedElements } from '@/lib/graph-layout'
import { EDGE_STYLES } from '@/components/learning-map/LearningMap'
import type {
  SkillPathResponse, CareerPathResponse, RelatedSkillsResponse,
} from '@/types'

// ── SSR-safe dynamic import of React Flow canvas ──────────────────────────────

const LearningMap = dynamic(
  () => import('@/components/learning-map/LearningMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#060c18]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Rendering graph…</p>
        </div>
      </div>
    ),
  },
)

// ── Skill domain inference ────────────────────────────────────────────────────

const SKILL_DOMAINS: Record<string, string> = {
  'Python': 'Programming', 'JavaScript': 'Web Development', 'TypeScript': 'Web Development',
  'React': 'Web Development', 'HTML': 'Web Development', 'CSS': 'Web Development',
  'SQL': 'Database', 'MongoDB': 'Database', 'PostgreSQL': 'Database',
  'Data Analysis': 'Data Science', 'Data Science': 'Data Science', 'Pandas': 'Data Science',
  'Statistics': 'Statistics', 'Linear Algebra': 'Statistics', 'Probability': 'Statistics',
  'Machine Learning': 'Machine Learning', 'Scikit-learn': 'Machine Learning',
  'Deep Learning': 'Deep Learning', 'TensorFlow': 'Deep Learning', 'PyTorch': 'Deep Learning',
  'NLP': 'Natural Language Processing', 'LLMs': 'Natural Language Processing',
  'Computer Vision': 'Computer Vision', 'OpenCV': 'Computer Vision',
  'Docker': 'DevOps', 'Kubernetes': 'DevOps', 'MLOps': 'DevOps', 'CI/CD': 'DevOps',
  'AWS': 'Cloud', 'GCP': 'Cloud', 'Azure': 'Cloud',
  'Feature Engineering': 'Machine Learning', 'Data Visualization': 'Data Science',
}

function domainOf(skill: string): string {
  return SKILL_DOMAINS[skill] ?? 'Data Science'
}

// ── Weeks estimate ────────────────────────────────────────────────────────────

const WEEKS: Record<string, number> = {
  'Python': 4, 'Data Analysis': 5, 'Machine Learning': 8, 'Deep Learning': 10,
  'NLP': 7, 'Computer Vision': 7, 'Statistics': 6, 'SQL': 3,
  'Docker': 3, 'Kubernetes': 5, 'AWS': 5, 'React': 5, 'TypeScript': 4,
}
const weeksFor = (s: string) => WEEKS[s] ?? 4

// ── Map type definitions ──────────────────────────────────────────────────────

type MapMode = 'skill-path' | 'career-map' | 'prerequisites'

const MAP_MODES: { id: MapMode; label: string; icon: React.ElementType; desc: string; accent: string }[] = [
  {
    id: 'skill-path',
    label: 'Skill Path',
    icon: TrendingUp,
    desc: 'Step-by-step progression between skills',
    accent: '#3b82f6',
  },
  {
    id: 'career-map',
    label: 'Career Map',
    icon: Briefcase,
    desc: 'Full career roadmap with gap analysis',
    accent: '#f59e0b',
  },
  {
    id: 'prerequisites',
    label: 'Prerequisites',
    icon: GitBranch,
    desc: 'What you need to know before learning X',
    accent: '#8b5cf6',
  },
]

// ── Data transformers ─────────────────────────────────────────────────────────

function skillPathToFlow(res: SkillPathResponse): { nodes: Node[]; edges: Edge[] } {
  if (!res.path_found || res.path.length === 0) return { nodes: [], edges: [] }

  // Start milestone
  const raw: Node[] = [
    {
      id: 'start',
      type: 'milestoneNode',
      data: { label: 'Start', variant: 'start' },
      position: { x: 0, y: 0 },
      width: 120, height: 40,
    },
  ]

  const rawEdges: Edge[] = []

  res.path.forEach((step, i) => {
    const id = `skill-${i}`
    raw.push({
      id,
      type: 'skillNode',
      data: {
        label: step.skill,
        domain: domainOf(step.skill),
        courses: step.courses.length,
        weeks: step.estimated_weeks,
        level: i === 0 ? 'Beginner' : i < res.path.length / 2 ? 'Intermediate' : 'Advanced',
        relType: step.rel_type,
      },
      position: { x: 0, y: 0 },
      width: 240, height: 110,
    })

    // Edge: from previous skill (or start milestone)
    const srcId = i === 0 ? 'start' : `skill-${i - 1}`
    rawEdges.push({
      id: `e-${srcId}-${id}`,
      source: srcId,
      target: id,
      ...EDGE_STYLES.progression,
      label: i > 0 ? `~${step.estimated_weeks}w` : undefined,
    })

    // Top course as child node
    if (step.courses.length > 0) {
      const c = step.courses[0]
      const cid = `course-${i}-0`
      raw.push({
        id: cid,
        type: 'courseNode',
        data: {
          id: c.id,
          course_name: c.course_name,
          organization: c.organization,
          rating: c.rating,
          difficulty_level: c.difficulty_level,
          course_url: c.course_url,
        },
        position: { x: 0, y: 0 },
        width: 210, height: 130,
      })
      rawEdges.push({
        id: `e-${id}-${cid}`,
        source: id,
        target: cid,
        ...EDGE_STYLES.course,
        label: 'learn via',
      })
    }
  })

  // End milestone
  const lastId = `skill-${res.path.length - 1}`
  raw.push({
    id: 'end',
    type: 'milestoneNode',
    data: { label: `✓ ${res.to_skill} mastered`, variant: 'end' },
    position: { x: 0, y: 0 },
    width: 200, height: 40,
  })
  rawEdges.push({
    id: 'e-last-end',
    source: lastId,
    target: 'end',
    ...EDGE_STYLES.progression,
    label: 'goal reached',
  })

  return getLayoutedElements(raw, rawEdges, { direction: 'TB', nodeWidth: 240, nodeHeight: 110, rankSep: 80, nodeSep: 80 })
}

function careerPathToFlow(res: CareerPathResponse): { nodes: Node[]; edges: Edge[] } {
  const raw: Node[] = []
  const rawEdges: Edge[] = []

  // Career root
  raw.push({
    id: 'career',
    type: 'careerNode',
    data: {
      title: res.career_goal,
      readiness: res.readiness_score,
      requiredCount: res.required_skills.length,
      missingCount: res.missing_skills.length,
    },
    position: { x: 0, y: 0 },
    width: 260, height: 110,
  })

  // Skill nodes
  res.skill_gaps.forEach((gap, i) => {
    const sid = `skill-${i}`
    raw.push({
      id: sid,
      type: 'skillNode',
      data: {
        label: gap.skill,
        domain: domainOf(gap.skill),
        courses: gap.courses.length,
        completed: gap.have,
        importance: gap.importance,
        weeks: weeksFor(gap.skill),
      },
      position: { x: 0, y: 0 },
      width: 230, height: 110,
    })

    const haveColor = gap.have ? '#10b981' : '#ef4444'
    rawEdges.push({
      id: `e-career-${sid}`,
      source: 'career',
      target: sid,
      ...EDGE_STYLES.required,
      markerEnd: { type: MarkerType.ArrowClosed, color: haveColor },
      style: { ...EDGE_STYLES.required.style, stroke: haveColor },
      label: gap.have ? '✓ owned' : gap.importance,
    })

    // Top course for missing skills
    if (!gap.have && gap.courses.length > 0) {
      const c = gap.courses[0]
      const cid = `course-${i}`
      raw.push({
        id: cid,
        type: 'courseNode',
        data: {
          id: c.id,
          course_name: c.course_name,
          organization: c.organization,
          rating: c.rating,
          difficulty_level: c.difficulty_level,
        },
        position: { x: 0, y: 0 },
        width: 210, height: 125,
      })
      rawEdges.push({
        id: `e-${sid}-${cid}`,
        source: sid,
        target: cid,
        ...EDGE_STYLES.course,
        label: 'study with',
      })
    }
  })

  return getLayoutedElements(raw, rawEdges, { direction: 'TB', nodeWidth: 240, nodeHeight: 110, rankSep: 90, nodeSep: 60 })
}

function prereqToFlow(skill: string, res: RelatedSkillsResponse): { nodes: Node[]; edges: Edge[] } {
  const raw: Node[] = []
  const rawEdges: Edge[] = []

  // Target skill (centre)
  raw.push({
    id: 'target',
    type: 'skillNode',
    data: { label: skill, domain: domainOf(skill), courses: res.taught_by_courses.length, weeks: weeksFor(skill), inProgress: true },
    position: { x: 0, y: 0 },
    width: 240, height: 110,
  })

  // Prerequisite skills feeding INTO target (leads_to means skill → target)
  res.leads_to.forEach((s, i) => {
    const id = `leads-${i}`
    raw.push({
      id,
      type: 'skillNode',
      data: { label: s, domain: domainOf(s), weeks: weeksFor(s) },
      position: { x: 0, y: 0 },
      width: 230, height: 110,
    })
    rawEdges.push({
      id: `e-${id}-target`,
      source: id,
      target: 'target',
      ...EDGE_STYLES.prereq,
      label: 'leads to',
    })
  })

  // Skills this one advances to
  res.advances_to.forEach((s, i) => {
    const id = `adv-${i}`
    raw.push({
      id,
      type: 'skillNode',
      data: { label: s, domain: domainOf(s), weeks: weeksFor(s) },
      position: { x: 0, y: 0 },
      width: 230, height: 110,
    })
    rawEdges.push({
      id: `e-target-${id}`,
      source: 'target',
      target: id,
      ...EDGE_STYLES.progression,
      label: 'advances to',
    })
  })

  // Related skills (horizontal peers)
  res.related_to.slice(0, 4).forEach((s, i) => {
    const id = `rel-${i}`
    raw.push({
      id,
      type: 'skillNode',
      data: { label: s, domain: domainOf(s), weeks: weeksFor(s) },
      position: { x: 0, y: 0 },
      width: 210, height: 100,
    })
    rawEdges.push({
      id: `e-target-${id}`,
      source: 'target',
      target: id,
      ...EDGE_STYLES.related,
      label: 'related',
    })
  })

  // Top courses
  res.taught_by_courses.slice(0, 2).forEach((c, i) => {
    const id = `tc-${i}`
    raw.push({
      id,
      type: 'courseNode',
      data: {
        id: c.id,
        course_name: c.course_name,
        organization: c.organization,
        rating: c.rating,
        difficulty_level: c.difficulty_level,
      },
      position: { x: 0, y: 0 },
      width: 210, height: 125,
    })
    rawEdges.push({
      id: `e-${id}-target`,
      source: id,
      target: 'target',
      ...EDGE_STYLES.course,
      label: 'teaches',
    })
  })

  return getLayoutedElements(raw, rawEdges, { direction: 'TB', nodeWidth: 240, nodeHeight: 110, rankSep: 100, nodeSep: 70 })
}

// ── Default demo — Python → Deep Learning ────────────────────────────────────

const DEMO_CHAIN = [
  { skill: 'Python',           domain: 'Programming',       weeks: 4, courses: 12, level: 'Beginner' },
  { skill: 'Data Analysis',    domain: 'Data Science',      weeks: 5, courses: 8,  level: 'Beginner' },
  { skill: 'Machine Learning', domain: 'Machine Learning',  weeks: 8, courses: 15, level: 'Intermediate' },
  { skill: 'Deep Learning',    domain: 'Deep Learning',     weeks: 10, courses: 9, level: 'Advanced' },
]

const DEMO_COURSE_MAP: Record<string, { name: string; org: string; rating: number; level: string }> = {
  'Python':           { name: 'Python for Everybody',              org: 'University of Michigan',      rating: 4.8, level: 'Beginner' },
  'Data Analysis':    { name: 'Google Data Analytics',             org: 'Google',                      rating: 4.8, level: 'Beginner' },
  'Machine Learning': { name: 'Machine Learning Specialization',   org: 'Stanford / DeepLearning.AI',  rating: 4.9, level: 'Intermediate' },
  'Deep Learning':    { name: 'Deep Learning Specialization',      org: 'DeepLearning.AI',             rating: 4.9, level: 'Advanced' },
}

function buildDemoFlow(): { nodes: Node[]; edges: Edge[] } {
  const raw: Node[] = [
    {
      id: 'start',
      type: 'milestoneNode',
      data: { label: 'Your Journey Begins', variant: 'start' },
      position: { x: 0, y: 0 },
      width: 180, height: 40,
    },
  ]
  const rawEdges: Edge[] = []

  DEMO_CHAIN.forEach((s, i) => {
    const sid = `skill-${i}`
    raw.push({
      id: sid,
      type: 'skillNode',
      data: { label: s.skill, domain: s.domain, courses: s.courses, weeks: s.weeks, level: s.level },
      position: { x: 0, y: 0 },
      width: 240, height: 110,
    })
    rawEdges.push({
      id: `e-${i === 0 ? 'start' : `skill-${i - 1}`}-${sid}`,
      source: i === 0 ? 'start' : `skill-${i - 1}`,
      target: sid,
      ...EDGE_STYLES.progression,
      label: i > 0 ? `~${s.weeks}w` : undefined,
    })

    // Top course
    const c = DEMO_COURSE_MAP[s.skill]
    if (c) {
      const cid = `course-${i}`
      raw.push({
        id: cid,
        type: 'courseNode',
        data: { id: cid, course_name: c.name, organization: c.org, rating: c.rating, difficulty_level: c.level },
        position: { x: 0, y: 0 },
        width: 210, height: 120,
      })
      rawEdges.push({ id: `e-${sid}-${cid}`, source: sid, target: cid, ...EDGE_STYLES.course, label: 'top course' })
    }
  })

  raw.push({
    id: 'end',
    type: 'milestoneNode',
    data: { label: '🏆  AI / ML Expert', variant: 'end' },
    position: { x: 0, y: 0 },
    width: 200, height: 40,
  })
  rawEdges.push({
    id: 'e-last-end',
    source: 'skill-3',
    target: 'end',
    ...EDGE_STYLES.progression,
    label: 'goal reached',
  })

  return getLayoutedElements(raw, rawEdges, { direction: 'TB', rankSep: 80, nodeSep: 80 })
}

// ── Node detail sidebar ───────────────────────────────────────────────────────

function NodeDetail({ node, onClose }: { node: Node; onClose: () => void }) {
  const d = node.data as Record<string, unknown>
  const isCourse  = node.type === 'courseNode'
  const isCareer  = node.type === 'careerNode'
  const isSkill   = node.type === 'skillNode'

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="absolute top-0 right-0 h-full w-80 bg-[#0c1426]/95 backdrop-blur border-l border-[#1e293b] z-20 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[#1e293b]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border mb-2 inline-block"
              style={isCourse ? { color: '#3b82f6', borderColor: '#3b82f640', background: '#3b82f615' }
                : isCareer ? { color: '#f59e0b', borderColor: '#f59e0b40', background: '#f59e0b15' }
                : { color: '#10b981', borderColor: '#10b98140', background: '#10b98115' }}
            >
              {isCourse ? 'Course' : isCareer ? 'Career Goal' : 'Skill'}
            </span>
            <h3 className="font-bold text-white text-sm leading-snug">
              {isCourse ? String(d.course_name) : isCareer ? String(d.title) : String(d.label)}
            </h3>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 text-slate-400 transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Skill node details */}
        {isSkill && (
          <>
            {d.domain && (
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-300">{String(d.domain)}</span>
              </div>
            )}
            {d.weeks != null && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-300">~{String(d.weeks)} weeks to learn</span>
              </div>
            )}
            {d.courses != null && (
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-300">{String(d.courses)} courses available</span>
              </div>
            )}
            {d.completed && (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">You already know this skill</span>
              </div>
            )}
            {d.locked && (
              <div className="flex items-center gap-2 text-slate-500">
                <Lock className="w-4 h-4" />
                <span className="text-sm">Complete prerequisites first</span>
              </div>
            )}
            {d.importance && (
              <div
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: d.importance === 'critical' ? '#ef4444' : d.importance === 'important' ? '#f59e0b' : '#64748b' }}
              >
                <AlertCircle className="w-4 h-4" />
                {String(d.importance).charAt(0).toUpperCase() + String(d.importance).slice(1)} skill
              </div>
            )}
          </>
        )}

        {/* Course node details */}
        {isCourse && (
          <>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-slate-300">{String(d.organization)}</span>
            </div>
            {(d.rating as number) > 0 && (
              <div className="flex items-center gap-1.5 text-amber-400">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-semibold">{(d.rating as number).toFixed(1)}</span>
                <span className="text-xs text-slate-500 font-normal">rating</span>
              </div>
            )}
            <div>
              <span
                className="inline-block text-xs px-2.5 py-1 rounded-full font-semibold border"
                style={(() => {
                  const colors: Record<string, { color: string; bg: string; border: string }> = {
                    Beginner:     { color: '#10b981', bg: '#10b98115', border: '#10b98140' },
                    Intermediate: { color: '#3b82f6', bg: '#3b82f615', border: '#3b82f640' },
                    Advanced:     { color: '#8b5cf6', bg: '#8b5cf615', border: '#8b5cf640' },
                    Mixed:        { color: '#64748b', bg: '#64748b15', border: '#64748b40' },
                  }
                  const c = colors[String(d.difficulty_level)] ?? colors.Mixed
                  return { color: c.color, background: c.bg, borderColor: c.border }
                })()}
              >
                {String(d.difficulty_level)}
              </span>
            </div>
            {d.course_url && (
              <a
                href={String(d.course_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open course
              </a>
            )}
          </>
        )}

        {/* Career node details */}
        {isCareer && (
          <>
            <div>
              <div className="text-xs text-slate-500 mb-1">Readiness</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-[#1e293b] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${d.readiness}%`,
                      background: (d.readiness as number) >= 70 ? '#10b981' : (d.readiness as number) >= 40 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-white">{(d.readiness as number).toFixed(0)}%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-lg font-bold text-emerald-400">
                  {(d.requiredCount as number) - (d.missingCount as number)}
                </div>
                <div className="text-[11px] text-slate-400">skills owned</div>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="text-lg font-bold text-red-400">{d.missingCount as number}</div>
                <div className="text-[11px] text-slate-400">skills needed</div>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LearningMapPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mode, setMode] = useState<MapMode>('skill-path')
  const [flowData, setFlowData] = useState<{ nodes: Node[]; edges: Edge[] }>(() => buildDemoFlow())
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{ nodes: number; edges: number; time: number } | null>(null)

  // Skill Path inputs
  const [fromSkill, setFromSkill] = useState('Python')
  const [toSkill,   setToSkill]   = useState('Deep Learning')

  // Career Map inputs
  const [careerGoal,    setCareerGoal]    = useState('Data Scientist')
  const [currentSkills, setCurrentSkills] = useState('Python, Statistics')

  // Prerequisites inputs
  const [prereqSkill, setPrereqSkill] = useState('Machine Learning')

  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode((prev) => prev?.id === node.id ? null : node)
  }, [])

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelectedNode(null)
    const t0 = performance.now()

    try {
      let result: { nodes: Node[]; edges: Edge[] }

      if (mode === 'skill-path') {
        const res = await api.skillPath(fromSkill.trim(), toSkill.trim())
        result = skillPathToFlow(res)
        if (result.nodes.length === 0) throw new Error(`No skill path found from "${fromSkill}" to "${toSkill}". Try different skills.`)

      } else if (mode === 'career-map') {
        const skills = currentSkills.split(',').map((s) => s.trim()).filter(Boolean)
        const res = await api.careerPath(careerGoal.trim(), skills)
        result = careerPathToFlow(res)

      } else {
        const res = await api.relatedSkills(prereqSkill.trim())
        result = prereqToFlow(prereqSkill.trim(), res)
      }

      setFlowData(result)
      setStats({ nodes: result.nodes.length, edges: result.edges.length, time: Math.round(performance.now() - t0) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load map. Ensure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [mode, fromSkill, toSkill, careerGoal, currentSkills, prereqSkill])

  const currentMode = MAP_MODES.find((m) => m.id === mode)!

  return (
    <div className="flex h-screen overflow-hidden bg-[#060c18]">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <div className="flex-1 flex overflow-hidden">
          {/* ── Left control panel ────────────────────────────────────── */}
          <div className="w-72 flex-shrink-0 border-r border-[#1e293b] bg-[#0c1426] flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="p-5 border-b border-[#1e293b]">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Map className="w-4 h-4 text-white" />
                </div>
                <h1 className="font-bold text-white text-base">Learning Maps</h1>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Interactive roadmaps powered by the knowledge graph — visualise skill trees, career paths, and prerequisites.
              </p>
            </div>

            {/* Map type selector */}
            <div className="p-4 border-b border-[#1e293b]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Map Type</div>
              <div className="space-y-2">
                {MAP_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); setError(null) }}
                    className="w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all"
                    style={mode === m.id ? {
                      borderColor: `${m.accent}50`,
                      background: `${m.accent}12`,
                      boxShadow: `0 0 12px ${m.accent}20`,
                    } : {
                      borderColor: '#1e293b',
                      background: 'transparent',
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${m.accent}20` }}
                    >
                      <m.icon className="w-3.5 h-3.5" style={{ color: m.accent }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{m.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode-specific inputs */}
            <div className="p-4 flex-1 space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Parameters</div>

              <AnimatePresence mode="wait">
                {mode === 'skill-path' && (
                  <motion.div key="sp" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1.5">From Skill</label>
                      <input
                        value={fromSkill}
                        onChange={(e) => setFromSkill(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#0f172a] border border-[#1e293b] rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                        placeholder="e.g. Python"
                        onKeyDown={(e) => e.key === 'Enter' && run()}
                      />
                    </div>
                    <div className="flex justify-center">
                      <ArrowRight className="w-4 h-4 text-slate-600 rotate-90" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1.5">To Skill</label>
                      <input
                        value={toSkill}
                        onChange={(e) => setToSkill(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#0f172a] border border-[#1e293b] rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                        placeholder="e.g. Deep Learning"
                        onKeyDown={(e) => e.key === 'Enter' && run()}
                      />
                    </div>
                    {/* Quick examples */}
                    <div>
                      <div className="text-[10px] text-slate-600 mb-1.5">Quick examples</div>
                      {[
                        ['Python', 'Deep Learning'],
                        ['Statistics', 'Machine Learning'],
                        ['HTML', 'React'],
                        ['SQL', 'Data Engineering'],
                      ].map(([f, t]) => (
                        <button
                          key={f + t}
                          onClick={() => { setFromSkill(f); setToSkill(t) }}
                          className="block w-full text-left text-[11px] text-slate-500 hover:text-slate-300 py-1 transition-colors"
                        >
                          <span className="text-blue-400">{f}</span>
                          <span className="text-slate-600"> → </span>
                          <span className="text-purple-400">{t}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {mode === 'career-map' && (
                  <motion.div key="cm" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1.5">Career Goal</label>
                      <input
                        value={careerGoal}
                        onChange={(e) => setCareerGoal(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#0f172a] border border-[#1e293b] rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
                        placeholder="e.g. Data Scientist"
                        onKeyDown={(e) => e.key === 'Enter' && run()}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1.5">Current Skills <span className="text-slate-600">(comma-separated)</span></label>
                      <textarea
                        value={currentSkills}
                        onChange={(e) => setCurrentSkills(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 text-sm bg-[#0f172a] border border-[#1e293b] rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
                        placeholder="e.g. Python, SQL, Statistics"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['Data Scientist', 'ML Engineer', 'Full Stack Developer', 'Data Engineer'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setCareerGoal(c)}
                          className="text-[10px] px-2 py-1 rounded-full border transition-colors"
                          style={careerGoal === c
                            ? { borderColor: '#f59e0b50', background: '#f59e0b15', color: '#f59e0b' }
                            : { borderColor: '#1e293b', color: '#64748b' }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {mode === 'prerequisites' && (
                  <motion.div key="pr" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1.5">Target Skill</label>
                      <input
                        value={prereqSkill}
                        onChange={(e) => setPrereqSkill(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#0f172a] border border-[#1e293b] rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
                        placeholder="e.g. Machine Learning"
                        onKeyDown={(e) => e.key === 'Enter' && run()}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 leading-relaxed">
                      Shows what leads to this skill, what it advances to, and related skills — forming a full dependency map.
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['Machine Learning', 'Deep Learning', 'NLP', 'React', 'Docker'].map((s) => (
                        <button
                          key={s}
                          onClick={() => setPrereqSkill(s)}
                          className="text-[10px] px-2.5 py-1 rounded-full border transition-colors"
                          style={prereqSkill === s
                            ? { borderColor: '#8b5cf650', background: '#8b5cf615', color: '#8b5cf6' }
                            : { borderColor: '#1e293b', color: '#64748b' }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={run}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${currentMode.accent}, ${currentMode.accent}cc)`,
                  color: '#fff',
                  boxShadow: loading ? 'none' : `0 4px 20px ${currentMode.accent}40`,
                }}
              >
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
                  : <><Zap className="w-4 h-4" /> Generate Map</>
                }
              </button>

              {/* Demo button */}
              <button
                onClick={() => { setFlowData(buildDemoFlow()); setError(null); setStats(null) }}
                className="w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors py-1"
              >
                ↩ Reset to demo (Python → Deep Learning)
              </button>
            </div>

            {/* Stats bar */}
            {stats && (
              <div className="p-4 border-t border-[#1e293b]">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Nodes', value: stats.nodes, icon: Layers },
                    { label: 'Edges', value: stats.edges, icon: GitBranch },
                    { label: 'ms', value: stats.time, icon: Zap },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="p-2 rounded-lg bg-[#0f172a] border border-[#1e293b]">
                      <Icon className="w-3 h-3 mx-auto mb-1 text-slate-500" />
                      <div className="text-sm font-bold text-white">{value}</div>
                      <div className="text-[9px] text-slate-600 uppercase tracking-wide">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── React Flow canvas ──────────────────────────────────────── */}
          <div className="flex-1 relative overflow-hidden">
            <ReactFlowProvider>
              <LearningMap
                initialNodes={flowData.nodes}
                initialEdges={flowData.edges}
                onNodeClick={handleNodeClick}
                className="w-full h-full"
              />
            </ReactFlowProvider>

            {/* Node detail drawer */}
            <AnimatePresence>
              {selectedNode && (
                <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
              )}
            </AnimatePresence>

            {/* Top info strip */}
            <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur"
                style={{
                  borderColor: `${currentMode.accent}40`,
                  background: `${currentMode.accent}15`,
                  color: currentMode.accent,
                }}
              >
                <currentMode.icon className="w-3.5 h-3.5" />
                {currentMode.label}
              </div>
              {flowData.nodes.length > 0 && (
                <div className="px-2.5 py-1.5 rounded-full text-[11px] text-slate-500 bg-[#0f172a]/70 backdrop-blur border border-[#1e293b]">
                  {flowData.nodes.length} nodes · {flowData.edges.length} edges
                </div>
              )}
            </div>

            {/* Empty state */}
            {flowData.nodes.length === 0 && !loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-2">
                  <BarChart3 className="w-12 h-12 text-slate-700 mx-auto" />
                  <div className="text-slate-500 text-sm">No map generated yet</div>
                  <div className="text-slate-600 text-xs">Click "Generate Map" in the left panel</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
