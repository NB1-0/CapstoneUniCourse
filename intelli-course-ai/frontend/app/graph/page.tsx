'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Share2, Activity, Layers, Cpu, Network,
  Search, ArrowRight, Star, ExternalLink, X, RotateCcw,
  TrendingUp, Brain, Briefcase, BookOpen, Target, Zap,
  Users, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { Navbar } from '@/components/Navbar'
import { GraphVisualizer } from '@/components/GraphVisualizer'
import { SkillPathCard } from '@/components/SkillPathCard'
import { api } from '@/lib/api'
import type {
  VizNode, GraphStats, GraphExploreData,
  SkillPathResponse, CareerPathResponse,
} from '@/types'

type Tab = 'explorer' | 'skill-path' | 'career-path'

const NODE_TYPE_COLORS: Record<string, string> = {
  Course: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  Skill: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  Career: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  Domain: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  LearningLevel: 'text-slate-400 bg-slate-500/15 border-slate-500/30',
}

const IMPORTANCE_STYLES = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  important: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  'nice-to-have': 'text-slate-400 bg-slate-500/10 border-slate-500/30',
}

export default function GraphPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('explorer')
  const [stats, setStats] = useState<GraphStats | null>(null)
  const [graphData, setGraphData] = useState<GraphExploreData | null>(null)
  const [selectedNode, setSelectedNode] = useState<VizNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Explorer filters
  const [filterTypes, setFilterTypes] = useState<Record<string, boolean>>({
    Course: true, Skill: true, Career: true, Domain: true, LearningLevel: false,
  })
  const [maxNodes, setMaxNodes] = useState(200)
  const [focusSkill, setFocusSkill] = useState('')

  // Skill Path
  const [fromSkill, setFromSkill] = useState('')
  const [toSkill, setToSkill] = useState('')
  const [skillPathResult, setSkillPathResult] = useState<SkillPathResponse | null>(null)
  const [skillPathLoading, setSkillPathLoading] = useState(false)

  // Career Path
  const [careerGoal, setCareerGoal] = useState('')
  const [currentSkillsInput, setCurrentSkillsInput] = useState('')
  const [careerResult, setCareerResult] = useState<CareerPathResponse | null>(null)
  const [careerLoading, setCareerLoading] = useState(false)
  const [availableCareers, setAvailableCareers] = useState<string[]>([])

  // Load stats on mount
  useEffect(() => {
    api.graphStats().then(setStats).catch(() => {})
    api.listCareers().then((r) => setAvailableCareers(r.careers.map((c) => c.title))).catch(() => {})
  }, [])

  const loadGraph = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const activeTypes = Object.entries(filterTypes).filter(([, v]) => v).map(([k]) => k)
      const data = await api.exploreGraph({
        node_types: activeTypes.join(','),
        max_nodes: maxNodes,
        focus_skill: focusSkill || undefined,
      })
      setGraphData(data)
      setSelectedNode(null)
    } catch (e) {
      setError('Failed to load graph. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [filterTypes, maxNodes, focusSkill])

  useEffect(() => {
    if (activeTab === 'explorer') loadGraph()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const findSkillPath = async () => {
    if (!fromSkill.trim() || !toSkill.trim()) return
    setSkillPathLoading(true)
    try {
      const result = await api.skillPath(fromSkill.trim(), toSkill.trim())
      setSkillPathResult(result)
    } catch {
      setSkillPathResult(null)
    } finally {
      setSkillPathLoading(false)
    }
  }

  const findCareerPath = async () => {
    if (!careerGoal.trim()) return
    setCareerLoading(true)
    try {
      const skills = currentSkillsInput.split(',').map((s) => s.trim()).filter(Boolean)
      const result = await api.careerPath(careerGoal.trim(), skills)
      setCareerResult(result)
    } catch {
      setCareerResult(null)
    } finally {
      setCareerLoading(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'explorer', label: 'Graph Explorer', icon: Network },
    { id: 'skill-path', label: 'Skill Path', icon: TrendingUp },
    { id: 'career-path', label: 'Career Path', icon: Briefcase },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-hidden flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Share2 className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Knowledge Graph</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                GraphRAG
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Explore skill relationships, career paths, and course connections through AI-powered graph reasoning
            </p>
          </div>

          {/* Stats chips */}
          {stats && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {[
                { label: 'Nodes', value: stats.total_nodes.toLocaleString(), icon: Layers, color: 'text-blue-400' },
                { label: 'Edges', value: stats.total_edges.toLocaleString(), icon: Activity, color: 'text-purple-400' },
                { label: 'Skills', value: (stats.nodes_by_type.Skill || 0).toString(), icon: Brain, color: 'text-emerald-400' },
                { label: 'Careers', value: (stats.nodes_by_type.Career || 0).toString(), icon: Briefcase, color: 'text-amber-400' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs">
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  <span className="text-muted-foreground">{stat.label}</span>
                  <span className="font-semibold text-foreground">{stat.value}</span>
                </div>
              ))}
              {stats.neo4j_active && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Neo4j Live</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'explorer' && (
            <motion.div
              key="explorer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex"
            >
              {/* Left filter panel */}
              <div className="w-56 flex-shrink-0 border-r border-border flex flex-col bg-card/30 overflow-y-auto">
                <div className="p-4 space-y-5">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Node Types</div>
                    <div className="space-y-1.5">
                      {Object.entries(filterTypes).map(([type, checked]) => (
                        <label key={type} className="flex items-center gap-2.5 cursor-pointer group">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              checked ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'
                            }`}
                            onClick={() => setFilterTypes((prev) => ({ ...prev, [type]: !prev[type] }))}
                          >
                            {checked && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className={`text-xs font-medium px-1.5 py-px rounded-full border ${NODE_TYPE_COLORS[type] ?? ''}`}>
                            {type}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Focus Skill</div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        value={focusSkill}
                        onChange={(e) => setFocusSkill(e.target.value)}
                        placeholder="e.g. Machine Learning"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                        onKeyDown={(e) => e.key === 'Enter' && loadGraph()}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Max Nodes: {maxNodes}
                    </div>
                    <input
                      type="range" min={50} max={400} step={50} value={maxNodes}
                      onChange={(e) => setMaxNodes(+e.target.value)}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>50</span><span>400</span>
                    </div>
                  </div>

                  <button
                    onClick={loadGraph}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    {loading ? 'Loading…' : 'Load Graph'}
                  </button>
                </div>

                {/* Graph info */}
                {graphData && (
                  <div className="p-4 mt-auto border-t border-border">
                    <div className="text-[10px] text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Displayed nodes</span>
                        <span className="font-medium text-foreground">{graphData.nodes.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Displayed edges</span>
                        <span className="font-medium text-foreground">{graphData.edges.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Load time</span>
                        <span className="font-medium text-foreground">{graphData.processing_time_ms.toFixed(0)}ms</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Graph canvas */}
              <div className="flex-1 relative bg-[#0a0a0f] overflow-hidden">
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
                      <div className="text-sm text-muted-foreground">{error}</div>
                      <button onClick={loadGraph} className="text-xs text-primary hover:underline">Try again</button>
                    </div>
                  </div>
                )}

                {loading && !graphData && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                      <div className="text-sm text-muted-foreground">Building knowledge graph…</div>
                    </div>
                  </div>
                )}

                {graphData && graphData.nodes.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                    No nodes match your filters. Try enabling more node types.
                  </div>
                )}

                {graphData && graphData.nodes.length > 0 && (
                  <GraphVisualizer
                    nodes={graphData.nodes}
                    edges={graphData.edges}
                    onNodeClick={setSelectedNode}
                    className="w-full h-full"
                  />
                )}
              </div>

              {/* Right: selected node detail */}
              <AnimatePresence>
                {selectedNode && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 300, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="flex-shrink-0 border-l border-border bg-card overflow-hidden"
                  >
                    <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'skill-path' && (
            <motion.div
              key="skill-path"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto"
            >
              <div className="max-w-3xl mx-auto p-6 space-y-6">
                {/* Input card */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-semibold text-foreground">Skill Progression Path</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">
                    Find the optimal learning sequence between two skills using graph traversal.
                    The system follows ADVANCES_TO and LEADS_TO relationships to discover the shortest path.
                  </p>

                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From Skill</label>
                      <input
                        value={fromSkill}
                        onChange={(e) => setFromSkill(e.target.value)}
                        placeholder="e.g. Python"
                        className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        onKeyDown={(e) => e.key === 'Enter' && findSkillPath()}
                      />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground mb-2.5 flex-shrink-0" />
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To Skill</label>
                      <input
                        value={toSkill}
                        onChange={(e) => setToSkill(e.target.value)}
                        placeholder="e.g. Deep Learning"
                        className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        onKeyDown={(e) => e.key === 'Enter' && findSkillPath()}
                      />
                    </div>
                    <button
                      onClick={findSkillPath}
                      disabled={skillPathLoading || !fromSkill.trim() || !toSkill.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {skillPathLoading ? (
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      ) : (
                        <Cpu className="w-4 h-4" />
                      )}
                      Find Path
                    </button>
                  </div>

                  {/* Example queries */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-xs text-muted-foreground">Try:</span>
                    {[
                      ['Python', 'Deep Learning'],
                      ['Statistics', 'Machine Learning'],
                      ['HTML', 'React'],
                      ['SQL', 'Data Engineering'],
                    ].map(([from, to]) => (
                      <button
                        key={from + to}
                        onClick={() => { setFromSkill(from); setToSkill(to) }}
                        className="text-xs px-2.5 py-1 rounded-full bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {from} → {to}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Results */}
                <AnimatePresence>
                  {skillPathResult && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      {skillPathResult.path_found && skillPathResult.path.length > 0 ? (
                        <div className="rounded-2xl border border-border bg-card p-5">
                          <SkillPathCard
                            steps={skillPathResult.path}
                            fromSkill={skillPathResult.from_skill}
                            toSkill={skillPathResult.to_skill}
                            totalWeeks={skillPathResult.estimated_weeks}
                          />
                          <div className="mt-4 pt-4 border-t border-border text-[11px] text-muted-foreground flex items-center gap-4">
                            <span>{skillPathResult.total_steps} steps</span>
                            <span>{skillPathResult.processing_time_ms.toFixed(0)}ms</span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-border bg-card p-8 text-center">
                          <XCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                          <div className="font-medium text-foreground mb-1">No path found</div>
                          <div className="text-sm text-muted-foreground">
                            No skill progression path exists between <strong>{skillPathResult.from_skill}</strong> and{' '}
                            <strong>{skillPathResult.to_skill}</strong> in the knowledge graph.
                            <br />Try different skill names or check that both skills exist.
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === 'career-path' && (
            <motion.div
              key="career-path"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto"
            >
              <div className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Input card */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-5 h-5 text-amber-400" />
                    <h2 className="font-semibold text-foreground">Career Path Analysis</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">
                    Select a career goal and enter your current skills. The graph engine will identify skill gaps
                    and generate a personalized course sequence ordered from beginner to advanced.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Career Goal</label>
                      <div className="flex gap-2 flex-wrap mb-2">
                        {availableCareers.slice(0, 8).map((c) => (
                          <button
                            key={c}
                            onClick={() => setCareerGoal(c)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              careerGoal === c
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      <input
                        value={careerGoal}
                        onChange={(e) => setCareerGoal(e.target.value)}
                        placeholder="or type a career title…"
                        className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Current Skills <span className="text-muted-foreground/50">(comma-separated)</span>
                      </label>
                      <input
                        value={currentSkillsInput}
                        onChange={(e) => setCurrentSkillsInput(e.target.value)}
                        placeholder="e.g. Python, SQL, Statistics"
                        className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>

                    <button
                      onClick={findCareerPath}
                      disabled={careerLoading || !careerGoal.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {careerLoading ? (
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <Target className="w-4 h-4" />
                      )}
                      Analyze Career Path
                    </button>
                  </div>
                </div>

                {/* Career Results */}
                <AnimatePresence>
                  {careerResult && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      {/* Readiness overview */}
                      <div className="rounded-2xl border border-border bg-card p-5">
                        <div className="flex items-start gap-6">
                          {/* Readiness gauge */}
                          <div className="text-center flex-shrink-0">
                            <div className="relative w-24 h-24">
                              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
                                <circle
                                  cx="18" cy="18" r="15.9" fill="none"
                                  stroke="currentColor" strokeWidth="3"
                                  strokeDasharray={`${careerResult.readiness_score} ${100 - careerResult.readiness_score}`}
                                  className={careerResult.readiness_score >= 70 ? 'text-emerald-400' : careerResult.readiness_score >= 40 ? 'text-amber-400' : 'text-red-400'}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-bold text-foreground">{careerResult.readiness_score.toFixed(0)}%</span>
                                <span className="text-[9px] text-muted-foreground">ready</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-foreground mb-1">{careerResult.career_goal}</h3>
                            <div className="flex gap-4 text-sm mb-3">
                              <span className="text-emerald-400 font-medium">
                                ✓ {careerResult.required_skills.length - careerResult.missing_skills.length} skills owned
                              </span>
                              <span className="text-red-400 font-medium">
                                ✗ {careerResult.missing_skills.length} skills missing
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {careerResult.required_skills.map((skill) => {
                                const have = !careerResult.missing_skills.includes(skill)
                                return (
                                  <span
                                    key={skill}
                                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                                      have ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'
                                    }`}
                                  >
                                    {have ? '✓ ' : '✗ '}{skill}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Skill gaps */}
                      <div className="rounded-2xl border border-border bg-card p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Brain className="w-4 h-4 text-purple-400" />
                          <h3 className="font-semibold text-foreground text-sm">Skill Gap Analysis</h3>
                        </div>
                        <div className="space-y-2">
                          {careerResult.skill_gaps.map((gap) => (
                            <div key={gap.skill} className="flex items-center gap-3 py-2">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${gap.have ? 'bg-emerald-400' : 'bg-red-400'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">{gap.skill}</span>
                                  <span className={`text-[10px] px-1.5 py-px rounded-full border font-medium ${IMPORTANCE_STYLES[gap.importance]}`}>
                                    {gap.importance}
                                  </span>
                                  {gap.have && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                </div>
                                {!gap.have && gap.courses.length > 0 && (
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {gap.courses[0].course_name}{gap.courses.length > 1 ? ` +${gap.courses.length - 1} more` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommended course sequence */}
                      {careerResult.recommended_sequence.length > 0 && (
                        <div className="rounded-2xl border border-border bg-card p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-4 h-4 text-blue-400" />
                            <h3 className="font-semibold text-foreground text-sm">Recommended Learning Sequence</h3>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {careerResult.recommended_sequence.length} courses · ordered beginner → advanced
                            </span>
                          </div>
                          <div className="space-y-2">
                            {careerResult.recommended_sequence.map((course, i) => (
                              <motion.div
                                key={course.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-start gap-3 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors group"
                              >
                                <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{course.course_name}</div>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="text-xs text-muted-foreground">{course.organization}</span>
                                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-px rounded-full">
                                      {course.difficulty_level}
                                    </span>
                                    {course.rating > 0 && (
                                      <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                                        <Star className="w-2.5 h-2.5 fill-current" />
                                        {course.rating.toFixed(1)}
                                      </span>
                                    )}
                                    {course.why_recommended && (
                                      <span className="text-[10px] text-muted-foreground italic hidden group-hover:block">
                                        {course.why_recommended}
                                      </span>
                                    )}
                                  </div>
                                  {course.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {course.skills.slice(0, 4).map((s) => (
                                        <span key={s} className="text-[10px] px-1.5 py-px rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {course.course_url && (
                                  <a
                                    href={course.course_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 hover:text-blue-300"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[11px] text-muted-foreground text-right">
                        Graph analysis completed in {careerResult.processing_time_ms.toFixed(0)}ms
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
        </div>
      </div>
    </div>
  )
}


function NodeDetailPanel({ node, onClose }: { node: VizNode; onClose: () => void }) {
  const [related, setRelated] = useState<{
    advances_to: string[]; related_to: string[]; leads_to: string[]
    required_by_careers: string[]
    taught_by_courses: Array<{ id: string; course_name: string; organization: string; rating: number; difficulty_level: string }>
  } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (node.type === 'Skill') {
      setLoading(true)
      api.relatedSkills(node.label).then(setRelated).catch(() => {}).finally(() => setLoading(false))
    } else {
      setRelated(null)
    }
  }, [node])

  const p = node.properties

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mb-1.5 ${NODE_TYPE_COLORS[node.type] ?? ''}`}>
              {node.type}
            </span>
            <h3 className="font-semibold text-foreground text-sm leading-snug">{node.label}</h3>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Course details */}
        {node.type === 'Course' && (
          <div className="space-y-3">
            {!!p.organization && <InfoRow label="Organization" value={String(p.organization)} />}
            {!!p.difficulty && (
              <InfoRow label="Level" value={
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  {String(p.difficulty)}
                </span>
              } />
            )}
            {!!p.rating && (
              <InfoRow label="Rating" value={
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {Number(p.rating).toFixed(1)}
                </span>
              } />
            )}
            {!!p.students_enrolled && Number(p.students_enrolled) > 0 && (
              <InfoRow label="Enrolled" value={
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  {Number(p.students_enrolled).toLocaleString()}
                </span>
              } />
            )}
            {!!p.url && (
              <a
                href={String(p.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Coursera
              </a>
            )}
          </div>
        )}

        {/* Career details */}
        {node.type === 'Career' && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">Required skills for this career path</div>
            <div className="text-xs text-muted-foreground italic">
              Use Career Path tab for full analysis with skill gap breakdown.
            </div>
          </div>
        )}

        {/* Skill details */}
        {node.type === 'Skill' && (
          <div className="space-y-4">
            {loading && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}

            {related && (
              <>
                {related.advances_to.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-emerald-400" /> Advances To
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {related.advances_to.map((s) => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {related.related_to.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-purple-400" /> Related Skills
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {related.related_to.map((s) => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {related.required_by_careers.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-amber-400" /> Required By Careers
                    </div>
                    <div className="space-y-1">
                      {related.required_by_careers.map((c) => (
                        <div key={c} className="text-xs text-amber-400">{c}</div>
                      ))}
                    </div>
                  </div>
                )}

                {related.taught_by_courses.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3 text-blue-400" /> Taught By
                    </div>
                    <div className="space-y-2">
                      {related.taught_by_courses.map((c) => (
                        <div key={c.id} className="p-2.5 rounded-lg bg-accent/30">
                          <div className="text-xs font-medium text-foreground leading-snug">{c.course_name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">{c.organization}</span>
                            {c.rating > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                                <Star className="w-2.5 h-2.5 fill-current" /> {c.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Domain details */}
        {node.type === 'Domain' && (
          <div className="text-sm text-muted-foreground">
            Domain cluster containing related skills. Explore the graph to see all skills in this domain.
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
      <div className="text-xs text-foreground text-right">{value}</div>
    </div>
  )
}
