'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Telescope, Sparkles, Clock, TrendingUp, LayoutGrid, GitBranch, Wand2, Brain, History } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { Navbar } from '@/components/Navbar'
import { StudentProfileForm, type ProfileFormData } from '@/components/future-path/StudentProfileForm'
import { TimelineCard } from '@/components/future-path/TimelineCard'
import { CareerTimelineGraph } from '@/components/future-path/CareerTimelineGraph'
import { WhatIfSimulator } from '@/components/future-path/WhatIfSimulator'
import { ProbabilityChart } from '@/components/future-path/ProbabilityChart'
import { MentorExplanationPanel } from '@/components/future-path/MentorExplanationPanel'
import { api } from '@/lib/api'
import { useMemory } from '@/contexts/MemoryContext'
import type { SimulationResponse, FutureCareerPath, WhatIfResponse } from '@/types'
import toast from 'react-hot-toast'

type Tab = 'compare' | 'timeline' | 'what-if' | 'mentor'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'compare',  label: 'Compare Paths',  icon: LayoutGrid },
  { id: 'timeline', label: 'Career Map',     icon: GitBranch },
  { id: 'what-if',  label: 'What-If',        icon: Wand2 },
  { id: 'mentor',   label: 'AI Mentor',      icon: Brain },
]

// ── Hero banner ───────────────────────────────────────────────────────────────

function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-transparent p-6 mb-6">
      {/* Decorative orbs */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-4 w-32 h-32 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 flex-shrink-0">
          <Telescope className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-lg font-bold">FuturePath AI</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              STAR FEATURE
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Simulate multiple possible career futures based on your skills, pace, and goals.
            Compare paths, run what-if scenarios, and get AI mentor guidance.
          </p>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-3">
        {[
          { icon: Sparkles,   label: 'AI-Scored Paths',    sub: 'Transparent probability formula' },
          { icon: Wand2,      label: 'What-If Simulations',sub: 'Scenario-based forecasting' },
          { icon: TrendingUp, label: 'Market-Aligned',     sub: 'Live job demand data' },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-center gap-2.5 rounded-xl bg-background/40 border border-border/60 px-3 py-2">
            <Icon className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium">{label}</p>
              <p className="text-[10px] text-muted-foreground">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ simulation }: { simulation: SimulationResponse }) {
  const best = simulation.paths[0]
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 mb-5 flex items-center justify-between flex-wrap gap-2"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <p className="text-sm text-emerald-300">{simulation.summary}</p>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        <span>Best match: <strong className="text-foreground">{best?.career_goal}</strong></span>
        <span className="text-emerald-400 font-bold">{best?.success_probability.toFixed(0)}%</span>
        <span>·</span>
        <span>{simulation.processing_time_ms.toFixed(0)} ms</span>
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FuturePathPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isLoading, setIsLoading]               = useState(false)
  const [simulation, setSimulation]             = useState<SimulationResponse | null>(null)
  const [selectedPath, setSelectedPath]         = useState<FutureCareerPath | null>(null)
  const [activeTab, setActiveTab]               = useState<Tab>('compare')
  const { userId } = useMemory()

  const handleSimulate = async (form: ProfileFormData) => {
    setIsLoading(true)
    setSimulation(null)
    setSelectedPath(null)
    try {
      const result = await api.simulateFuturePath({
        user_id: userId,
        ...form,
      })
      setSimulation(result)
      setSelectedPath(result.paths[0] ?? null)
      toast.success(`Generated ${result.paths.length} future timelines!`)
    } catch (e) {
      toast.error((e as Error).message || 'Simulation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWhatIf = async (scenario: string): Promise<WhatIfResponse | null> => {
    if (!simulation) return null
    try {
      return await api.whatIfSimulation({
        user_id: userId,
        base_simulation_id: simulation.simulation_id,
        scenario_change: scenario,
      })
    } catch (e) {
      toast.error((e as Error).message || 'What-if failed')
      return null
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-0">
            <HeroBanner />

            {/* Profile form */}
            <StudentProfileForm onSubmit={handleSimulate} isLoading={isLoading} />

            {/* Results */}
            <AnimatePresence>
              {simulation && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 space-y-5"
                >
                  <SummaryBar simulation={simulation} />

                  {/* Tab navigation */}
                  <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border w-fit">
                    {TABS.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          activeTab === id
                            ? 'bg-background shadow text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      {activeTab === 'compare' && (
                        <div className="space-y-6">
                          {/* Path cards grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            {simulation.paths.map((path, i) => (
                              <TimelineCard
                                key={path.path_id}
                                path={path}
                                rank={i}
                                isSelected={selectedPath?.path_id === path.path_id}
                                onSelect={() => setSelectedPath(path)}
                              />
                            ))}
                          </div>

                          {/* Chart */}
                          <ProbabilityChart paths={simulation.paths} selectedPath={selectedPath} />
                        </div>
                      )}

                      {activeTab === 'timeline' && selectedPath && (
                        <div className="space-y-4">
                          {/* Path selector */}
                          <div className="flex gap-2 flex-wrap">
                            {simulation.paths.map((p) => (
                              <button
                                key={p.path_id}
                                onClick={() => setSelectedPath(p)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                  selectedPath.path_id === p.path_id
                                    ? 'bg-primary/20 border-primary/50 text-primary'
                                    : 'border-border text-muted-foreground hover:border-primary/30'
                                }`}
                              >
                                {p.career_goal}
                              </button>
                            ))}
                          </div>
                          <CareerTimelineGraph path={selectedPath} />
                        </div>
                      )}

                      {activeTab === 'what-if' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          <WhatIfSimulator
                            simulationId={simulation.simulation_id}
                            userId={userId}
                            onSimulate={handleWhatIf}
                          />
                          {selectedPath && (
                            <div className="space-y-3">
                              <p className="text-xs text-muted-foreground font-medium">CURRENT BASE PATH</p>
                              <TimelineCard
                                path={selectedPath}
                                rank={0}
                                isSelected={false}
                                onSelect={() => {}}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'mentor' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                          {/* Path selector */}
                          <div className="lg:col-span-1 space-y-3">
                            <p className="text-xs text-muted-foreground font-medium">SELECT A PATH TO ANALYSE</p>
                            {simulation.paths.map((p, i) => (
                              <button
                                key={p.path_id}
                                onClick={() => setSelectedPath(p)}
                                className={`w-full text-left rounded-xl border p-3 transition-all ${
                                  selectedPath?.path_id === p.path_id
                                    ? 'border-primary/50 bg-primary/5'
                                    : 'border-border bg-card/40 hover:border-primary/30'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{p.career_goal}</span>
                                  <span className="text-xs text-primary font-bold">{p.success_probability.toFixed(0)}%</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{p.timeline_type} · {p.estimated_months}mo</p>
                              </button>
                            ))}

                            {/* Probability chart */}
                            <div className="mt-2">
                              <ProbabilityChart paths={simulation.paths} selectedPath={selectedPath} />
                            </div>
                          </div>

                          {/* Mentor panel */}
                          <div className="lg:col-span-2">
                            {selectedPath
                              ? <MentorExplanationPanel path={selectedPath} />
                              : (
                                <div className="rounded-2xl border border-border bg-card/40 flex items-center justify-center h-48">
                                  <p className="text-sm text-muted-foreground">Select a career path to see the AI mentor analysis.</p>
                                </div>
                              )
                            }
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {!simulation && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 text-center py-16 rounded-2xl border border-dashed border-border"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                  <Telescope className="w-7 h-7 text-violet-400" />
                </div>
                <h3 className="font-semibold mb-1">Your futures are waiting</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Fill in your student profile above and click &ldquo;Generate Future Timelines&rdquo; to simulate multiple
                  possible career paths with success probabilities, roadmaps, and AI mentor insights.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
