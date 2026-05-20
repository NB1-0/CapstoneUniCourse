'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, User, X, Plus, CheckCircle } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from 'next-themes'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

const COMMON_SKILLS = ['Python', 'SQL', 'Machine Learning', 'Deep Learning', 'Statistics', 'React', 'Node.js', 'Docker', 'AWS', 'Tableau']

export default function SettingsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : '')
  const [apiUrl, setApiUrl] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('apiUrl') || 'http://localhost:8000' : 'http://localhost:8000')
  const [diffPref, setDiffPref] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('diffPref') || 'any' : 'any')
  const [skills, setSkills] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('userSkills') || '[]') } catch { return [] }
  })
  const [skillInput, setSkillInput] = useState('')
  const [apiStatus, setApiStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  const addSkill = (s: string) => {
    const t = s.trim()
    if (t && !skills.includes(t)) { const u = [...skills, t]; setSkills(u); localStorage.setItem('userSkills', JSON.stringify(u)) }
    setSkillInput('')
  }

  const removeSkill = (s: string) => { const u = skills.filter((x) => x !== s); setSkills(u); localStorage.setItem('userSkills', JSON.stringify(u)) }

  const save = () => {
    localStorage.setItem('userName', name)
    localStorage.setItem('apiUrl', apiUrl)
    localStorage.setItem('diffPref', diffPref)
    toast.success('Settings saved!')
  }

  const testConnection = async () => {
    try {
      await api.health()
      setApiStatus('ok')
      toast.success('Backend connected!')
    } catch {
      setApiStatus('error')
      toast.error('Cannot connect to backend')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="page-header flex items-center gap-2"><Settings className="w-6 h-6 text-primary" /> Settings</h1>
              <p className="text-muted-foreground text-sm mt-1">Customize your IntelliCourse AI experience</p>
            </div>

            {/* Profile */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold flex items-center gap-2"><User className="w-4 h-4" /> Profile</h2>
              <div>
                <label className="section-label block mb-1.5">Display Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
            </div>

            {/* Preferences */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold">Preferences</h2>
              <div>
                <label className="section-label block mb-2">Default Difficulty</label>
                <div className="flex gap-2">
                  {['any', 'beginner', 'intermediate', 'advanced'].map((d) => (
                    <button key={d} onClick={() => setDiffPref(d)} className={`px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all ${diffPref === d ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="section-label block mb-2">Appearance</label>
                <div className="flex gap-2">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button key={t} onClick={() => setTheme(t)} className={`px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all ${theme === t ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Skill profile */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold">My Skills ({skills.length})</h2>
              <div className="flex gap-2">
                <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSkill(skillInput)} placeholder="Add a skill" className="flex-1" />
                <Button variant="outline" size="icon" onClick={() => addSkill(skillInput)}><Plus className="w-4 h-4" /></Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span key={s} className="skill-badge flex items-center gap-1">
                      {s}<button onClick={() => removeSkill(s)}><X className="w-3 h-3" /></button>
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

            {/* API settings */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold">Backend Connection</h2>
              <div>
                <label className="section-label block mb-1.5">API URL</label>
                <div className="flex gap-2">
                  <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="flex-1" />
                  <Button variant="outline" onClick={testConnection} className="flex-shrink-0">
                    {apiStatus === 'ok' && <CheckCircle className="w-4 h-4 text-emerald-500 mr-1" />}
                    Test
                  </Button>
                </div>
                {apiStatus === 'error' && <p className="text-xs text-destructive mt-1">Cannot connect. Is the backend running?</p>}
                {apiStatus === 'ok' && <p className="text-xs text-emerald-600 mt-1">Connected successfully!</p>}
              </div>
            </div>

            <Button onClick={save} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white">Save Settings</Button>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
