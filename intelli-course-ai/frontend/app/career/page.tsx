'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, X, Plus, Sparkles } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { Navbar } from '@/components/Navbar'
import { CareerMatchCard } from '@/components/CareerMatchCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCareerAlign } from '@/hooks/useLearningPath'
import { useSavedCourses } from '@/hooks/useRecommendations'
import type { CourseResult } from '@/types'
import toast from 'react-hot-toast'

const POPULAR_CAREERS = ['Data Scientist', 'Machine Learning Engineer', 'Cloud Architect', 'Full Stack Developer', 'Data Engineer', 'DevOps Engineer', 'Product Manager']
const COMMON_SKILLS = ['Python', 'SQL', 'Machine Learning', 'Deep Learning', 'AWS', 'React', 'Docker', 'Statistics', 'Tableau', 'Kubernetes']

export default function CareerPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [careerGoal, setCareerGoal] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const { data, isLoading, error, align } = useCareerAlign()
  const { save } = useSavedCourses()

  const addSkill = (s: string) => {
    const trimmed = s.trim()
    if (trimmed && !skills.includes(trimmed)) setSkills((prev) => [...prev, trimmed])
    setSkillInput('')
  }

  const handleAlign = async () => {
    if (!careerGoal.trim()) { toast.error('Please enter a career goal'); return }
    await align(careerGoal, skills)
  }

  const handleSave = (course: CourseResult) => { save(course); toast.success('Course saved!') }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
            <div>
              <h1 className="page-header flex items-center gap-2"><Briefcase className="w-6 h-6 text-primary" /> Career Explorer</h1>
              <p className="text-muted-foreground text-sm mt-1">Align your current skills with your dream career and discover the path forward.</p>
            </div>

            <div className="glass-card rounded-2xl p-6 space-y-5">
              <div>
                <label className="section-label block mb-2">Career Goal</label>
                <Input value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)} placeholder="e.g. Machine Learning Engineer at a top tech company" className="mb-2" />
                <div className="flex flex-wrap gap-2">
                  {POPULAR_CAREERS.map((c) => (
                    <button key={c} onClick={() => setCareerGoal(c)} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${careerGoal === c ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="section-label block mb-2">Your Current Skills (optional)</label>
                <div className="flex gap-2 mb-2">
                  <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSkill(skillInput)} placeholder="Add a skill" className="flex-1" />
                  <Button variant="outline" size="icon" onClick={() => addSkill(skillInput)}><Plus className="w-4 h-4" /></Button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {skills.map((s) => (
                      <span key={s} className="skill-badge flex items-center gap-1">
                        {s}<button onClick={() => setSkills(skills.filter((x) => x !== s))}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {COMMON_SKILLS.filter((s) => !skills.includes(s)).map((s) => (
                    <button key={s} onClick={() => addSkill(s)} className="text-xs px-2 py-0.5 rounded-full border border-dashed border-border hover:border-primary hover:text-primary transition-colors">+ {s}</button>
                  ))}
                </div>
              </div>

              <Button onClick={handleAlign} disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                {isLoading ? 'Analyzing...' : <><Sparkles className="w-4 h-4 mr-2" /> Explore Career Alignment</>}
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <CareerMatchCard data={data} isLoading={isLoading} onSave={handleSave} />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
