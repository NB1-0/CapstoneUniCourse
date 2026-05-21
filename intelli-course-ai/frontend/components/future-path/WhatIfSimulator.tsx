'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, Loader2, ArrowUp, ArrowDown, Minus, TrendingUp, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WhatIfResponse } from '@/types'

interface WhatIfSimulatorProps {
  simulationId: string
  userId: string
  onSimulate: (scenario: string) => Promise<WhatIfResponse | null>
}

const QUICK_SCENARIOS = [
  { label: 'Study 20h / week', value: 'increase_weekly_hours_to_20' },
  { label: 'Skip Mathematics', value: 'skip_mathematics' },
  { label: 'Already know Python', value: 'already know Python' },
  { label: 'Target GenAI Engineer', value: 'choose GenAI Engineer' },
  { label: 'Accelerated pace', value: 'accelerated pace' },
  { label: 'Prefer Beginner difficulty', value: 'prefer beginner difficulty' },
]

function DeltaBadge({ value, unit = '' }: { value: number; unit?: string }) {
  if (value > 0) return (
    <span className="inline-flex items-center gap-0.5 text-emerald-400 font-bold">
      <ArrowUp className="w-3 h-3" />+{value.toFixed(1)}{unit}
    </span>
  )
  if (value < 0) return (
    <span className="inline-flex items-center gap-0.5 text-red-400 font-bold">
      <ArrowDown className="w-3 h-3" />{value.toFixed(1)}{unit}
    </span>
  )
  return <span className="inline-flex items-center gap-0.5 text-muted-foreground"><Minus className="w-3 h-3" />No change</span>
}

function MetricComparison({ label, before, after, unit = '' }: { label: string; before: number | string; after: number | string; unit?: string }) {
  const bNum = typeof before === 'number' ? before : 0
  const aNum = typeof after === 'number' ? after : 0
  const delta = aNum - bNum
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3">
      <p className="text-[10px] text-muted-foreground mb-1.5">{label}</p>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs text-muted-foreground line-through">{typeof before === 'number' ? before.toFixed(1) : before}{unit}</span>
          <span className="ml-2 text-sm font-bold">{typeof after === 'number' ? after.toFixed(1) : after}{unit}</span>
        </div>
        {typeof delta === 'number' && <DeltaBadge value={delta} unit={unit} />}
      </div>
    </div>
  )
}

export function WhatIfSimulator({ simulationId, userId, onSimulate }: WhatIfSimulatorProps) {
  const [scenario, setScenario] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<WhatIfResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (s: string) => {
    const q = s.trim()
    if (!q) return
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await onSimulate(q)
      setResult(res)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuick = (value: string) => { setScenario(value); run(value) }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-violet-400" />
          What-If Simulator
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ask &ldquo;What if I study 15 hours a week?&rdquo; and see how your future changes.
        </p>
      </div>

      {/* Quick scenario chips */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_SCENARIOS.map((s) => (
          <button
            key={s.value}
            onClick={() => handleQuick(s.value)}
            className="text-xs px-3 py-1.5 rounded-full border border-dashed border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run(scenario)}
          placeholder='e.g. "What if I already know React?"'
          className="flex-1 h-10 px-3 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
        <Button
          onClick={() => run(scenario)}
          disabled={isLoading || !scenario.trim()}
          size="sm"
          className="h-10 px-4"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Explanation */}
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
              <p className="text-xs text-violet-300 leading-relaxed">{result.explanation}</p>
            </div>

            {/* Before / after grid */}
            <div className="grid grid-cols-2 gap-2">
              <MetricComparison
                label="Success Probability"
                before={result.before_metrics.success_probability}
                after={result.after_metrics.success_probability}
                unit="%"
              />
              <MetricComparison
                label="Timeline"
                before={result.before_metrics.estimated_months}
                after={result.after_metrics.estimated_months}
                unit=" mo"
              />
              <MetricComparison
                label="Timeline Type"
                before={result.before_metrics.timeline_type}
                after={result.after_metrics.timeline_type}
              />
              <div className="rounded-xl border border-border bg-background/50 p-3">
                <p className="text-[10px] text-muted-foreground mb-1.5">Difficulty Risk</p>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${result.risk_change === 'Increased' ? 'text-red-400' : result.risk_change === 'Decreased' ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    {result.after_metrics.difficulty_risk}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    result.risk_change === 'Increased' ? 'bg-red-500/15 text-red-400'
                    : result.risk_change === 'Decreased' ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-muted text-muted-foreground'}`}>
                    {result.risk_change}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-300">{result.recommendation}</p>
            </div>

            <p className="text-[10px] text-muted-foreground text-right">
              Computed in {result.processing_time_ms.toFixed(0)} ms
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
