'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Route, Sparkles } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { Navbar } from '@/components/Navbar'
import { LearningPathTimeline } from '@/components/LearningPathTimeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLearningPath } from '@/hooks/useLearningPath'
import toast from 'react-hot-toast'

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner', desc: 'I\'m new to this topic' },
  { value: 'intermediate', label: 'Intermediate', desc: 'I have some experience' },
  { value: 'advanced', label: 'Advanced', desc: 'I want to specialize further' },
]

const EXAMPLE_GOALS = [
  'Become a Machine Learning Engineer',
  'Master Data Science with Python',
  'Learn Cloud Computing on AWS',
  'Get into NLP and Transformers',
  'Become a Full Stack Developer',
]

export default function LearningPathPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState('beginner')
  const { data, isLoading, error, generate } = useLearningPath()

  const handleGenerate = async () => {
    if (!goal.trim()) { toast.error('Please enter a learning goal'); return }
    const result = await generate(goal, level)
    if (result) {
      localStorage.setItem('pathsGenerated', String((parseInt(localStorage.getItem('pathsGenerated') || '0') + 1)))
      toast.success('Learning path generated!')
    } else {
      toast.error(error || 'Failed to generate path')
    }
  }

  const handleSave = () => {
    if (!data) return
    localStorage.setItem('savedPath', JSON.stringify(data))
    toast.success('Learning path saved!')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
            <div>
              <h1 className="page-header flex items-center gap-2"><Route className="w-6 h-6 text-primary" /> Learning Path Generator</h1>
              <p className="text-muted-foreground text-sm mt-1">Tell us your goal — we&apos;ll build a structured roadmap from beginner to expert.</p>
            </div>

            {/* Input card */}
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <div>
                <label className="section-label block mb-2">Your Learning Goal</label>
                <div className="flex gap-2">
                  <Input
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g. Become a Machine Learning Engineer"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    className="flex-1"
                  />
                  <Button onClick={handleGenerate} disabled={isLoading} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6">
                    {isLoading ? 'Generating...' : <><Sparkles className="w-4 h-4 mr-1" /> Generate</>}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {EXAMPLE_GOALS.map((g) => (
                    <button key={g} onClick={() => setGoal(g)} className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary hover:text-primary transition-colors">
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="section-label block mb-2">Current Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {LEVEL_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => setLevel(value)}
                      className={`p-3 rounded-xl border text-left transition-all ${level === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    >
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {data && (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleSave}>Save Path</Button>
                </div>
              )}
            </div>

            {/* Timeline */}
            <LearningPathTimeline data={data} isLoading={isLoading} />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
