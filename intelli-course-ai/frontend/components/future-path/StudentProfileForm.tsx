'use client'
import { useState, KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ProfileFormData {
  current_skills: string[]
  completed_courses: string[]
  target_careers: string[]
  weekly_learning_hours: number
  preferred_difficulty: string
  learning_pace: string
  career_priority: string
}

interface StudentProfileFormProps {
  onSubmit: (data: ProfileFormData) => void
  isLoading: boolean
}

const SUGGESTED_SKILLS = ['Python', 'SQL', 'Statistics', 'Machine Learning', 'Deep Learning', 'JavaScript', 'React', 'Docker', 'AWS']
const SUGGESTED_CAREERS = ['ML Engineer', 'Data Scientist', 'GenAI Engineer', 'Data Engineer', 'Software Engineer', 'MLOps Engineer', 'Cloud Architect']
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']
const PACES = ['Slow', 'Moderate', 'Fast', 'Accelerated']

function TagInput({
  label, placeholder, tags, onAdd, onRemove, suggestions,
}: {
  label: string
  placeholder: string
  tags: string[]
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  suggestions?: string[]
}) {
  const [input, setInput] = useState('')

  const commit = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) { onAdd(v); setInput('') }
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
    if (e.key === 'Backspace' && !input && tags.length) onRemove(tags[tags.length - 1])
  }

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="mt-1.5 min-h-[44px] flex flex-wrap gap-1.5 items-center p-2 rounded-xl border border-border bg-background/50 focus-within:ring-1 focus-within:ring-primary/50 transition">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs border border-primary/20">
            {t}
            <button onClick={() => onRemove(t)} className="hover:text-red-400 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          placeholder={tags.length ? '' : placeholder}
          className="flex-1 min-w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {suggestions && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {suggestions.filter((s) => !tags.includes(s)).slice(0, 6).map((s) => (
            <button
              key={s}
              onClick={() => onAdd(s)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function StudentProfileForm({ onSubmit, isLoading }: StudentProfileFormProps) {
  const [skills, setSkills] = useState<string[]>([])
  const [courses, setCourses] = useState<string[]>([])
  const [careers, setCareers] = useState<string[]>([])
  const [hours, setHours] = useState(10)
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [pace, setPace] = useState('Moderate')
  const [priority, setPriority] = useState('balance')

  const handleSubmit = () => {
    onSubmit({
      current_skills: skills,
      completed_courses: courses,
      target_careers: careers,
      weekly_learning_hours: hours,
      preferred_difficulty: difficulty,
      learning_pace: pace,
      career_priority: priority,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 space-y-5"
    >
      <div>
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Student Profile
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Fill in your current standing — the more detail, the more accurate your future timelines.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <TagInput
          label="Current Skills"
          placeholder="Python, SQL, Docker…"
          tags={skills}
          onAdd={(v) => setSkills([...skills, v])}
          onRemove={(v) => setSkills(skills.filter((s) => s !== v))}
          suggestions={SUGGESTED_SKILLS}
        />
        <TagInput
          label="Target Careers"
          placeholder="Data Scientist, ML Engineer…"
          tags={careers}
          onAdd={(v) => setCareers([...careers, v])}
          onRemove={(v) => setCareers(careers.filter((c) => c !== v))}
          suggestions={SUGGESTED_CAREERS}
        />
        <TagInput
          label="Completed Courses (optional)"
          placeholder="Machine Learning Specialization…"
          tags={courses}
          onAdd={(v) => setCourses([...courses, v])}
          onRemove={(v) => setCourses(courses.filter((c) => c !== v))}
        />

        {/* Weekly hours slider */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Weekly Study Hours — <span className="text-foreground font-bold">{hours}h</span>
          </label>
          <input
            type="range" min={1} max={40} value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="mt-2 w-full h-1.5 accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>1h / wk</span><span>40h / wk</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Difficulty */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Difficulty</label>
          <div className="flex gap-1.5 mt-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                  difficulty === d
                    ? 'bg-primary/20 border-primary/50 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Pace */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Learning Pace</label>
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {PACES.map((p) => (
              <button
                key={p}
                onClick={() => setPace(p)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                  pace === p
                    ? 'bg-primary/20 border-primary/50 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</label>
          <div className="flex gap-1.5 mt-1.5">
            {[['speed', 'Speed'], ['balance', 'Balance'], ['quality', 'Quality']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setPriority(v)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                  priority === v
                    ? 'bg-primary/20 border-primary/50 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={isLoading} className="w-full h-11 font-semibold text-sm">
        {isLoading
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Simulating your futures…</>
          : <><Sparkles className="w-4 h-4 mr-2" /> Generate Future Timelines</>
        }
      </Button>
    </motion.div>
  )
}
