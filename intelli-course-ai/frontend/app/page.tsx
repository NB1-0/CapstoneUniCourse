'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Search, Route, BarChart3, Briefcase, Star, ArrowRight,
  GraduationCap, Sparkles, Brain, CheckCircle, BookOpen,
  ChevronRight, Moon, Sun, Zap, Users, Globe, Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'

const FEATURES = [
  { icon: Search, title: 'AI Course Search', desc: 'Natural language search across thousands of courses using semantic AI understanding.', color: 'from-blue-500 to-blue-600' },
  { icon: BarChart3, title: 'Skill Gap Analysis', desc: 'Identify exactly what skills you need to qualify for your target role.', color: 'from-purple-500 to-purple-600' },
  { icon: Route, title: 'Learning Path Generator', desc: 'Get a personalized Beginner → Intermediate → Advanced roadmap.', color: 'from-emerald-500 to-emerald-600' },
  { icon: Briefcase, title: 'Career Alignment', desc: 'Map courses and skills to specific job roles and career goals.', color: 'from-amber-500 to-amber-600' },
  { icon: Brain, title: 'Smart Recommendations', desc: 'AI advisor synthesizes your profile and recommends only relevant courses.', color: 'from-rose-500 to-rose-600' },
  { icon: BookOpen, title: 'Course Comparison', desc: 'Compare courses side-by-side on skills, difficulty, rating, and prerequisites.', color: 'from-cyan-500 to-cyan-600' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Tell the AI what you want', desc: 'Type your learning goal in plain English — no special syntax required.' },
  { step: '02', title: 'AI analyzes & retrieves', desc: 'Our multi-agent pipeline semantically searches 10,000+ indexed courses.' },
  { step: '03', title: 'Get personalized results', desc: 'Receive ranked recommendations with skill gap analysis and learning paths.' },
  { step: '04', title: 'Start learning', desc: 'Follow your AI-curated roadmap and track your progress to your goal.' },
]

const STATS = [
  { value: '10,000+', label: 'Courses Indexed', icon: BookOpen },
  { value: '500+', label: 'Skills Tracked', icon: Brain },
  { value: '50+', label: 'Top Universities', icon: Globe },
  { value: '95%', label: 'Relevance Score', icon: Star },
]

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'ML Engineer at Google', text: 'IntelliCourse found my perfect learning path from Python beginner to ML engineer in under a minute. Incredible tool!' },
  { name: 'James Chen', role: 'Data Scientist at Meta', text: 'The skill gap analysis was eye-opening. It told me exactly which 3 courses I was missing to qualify for senior roles.' },
  { name: 'Sarah O\'Brien', role: 'Cloud Architect at AWS', text: 'I planned my entire AWS certification journey using the career alignment feature. Now I\'m certified and employed!' },
]

export default function LandingPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-md">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm">IntelliCourse AI</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
              <a href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</a>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link href="/dashboard">
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md">
                  Get Started <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" /> Powered by GPT-4o + Semantic Search
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            Your{' '}
            <span className="gradient-text">AI-Powered</span>
            {' '}Course Intelligence Platform
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Discover the perfect courses, analyze your skill gaps, and generate a personalized learning path to your dream career — all in seconds.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl shadow-blue-500/30 px-8">
                Start Learning Free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/finder">
              <Button size="lg" variant="outline" className="px-8">
                <Search className="w-4 h-4 mr-2" /> Try AI Search
              </Button>
            </Link>
          </motion.div>
          {/* Trust bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-12 flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
            {['✓ No signup required', '✓ Works without API key (mock mode)', '✓ 30+ courses pre-loaded', '✓ Open source'].map((t) => (
              <span key={t} className="flex items-center gap-1">{t}</span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, label, icon: Icon }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="text-center">
                <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything you need to master any skill</h2>
            <p className="text-muted-foreground">Six powerful AI features working together to supercharge your learning journey</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="glass-card rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md mb-4`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">How IntelliCourse AI works</h2>
            <p className="text-muted-foreground">From query to personalized learning plan in seconds</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
              <motion.div key={step} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} viewport={{ once: true }} className="relative">
                <div className="text-5xl font-bold text-primary/10 mb-3">{step}</div>
                <h3 className="font-semibold mb-2 text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute top-12 -right-3 w-6 h-6 text-muted-foreground/30" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Loved by learners worldwide</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, text }, i) => (
              <motion.div key={name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="glass-card rounded-2xl p-6">
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">&ldquo;{text}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="text-xs text-muted-foreground">{role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="gradient-bg rounded-3xl p-12 text-white">
            <Zap className="w-10 h-10 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl font-bold mb-4">Ready to accelerate your learning?</h2>
            <p className="text-white/80 mb-8">Join thousands of learners using AI to navigate their education journey.</p>
            <Link href="/dashboard">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-white/90 font-semibold px-10">
                Start for Free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <GraduationCap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium">IntelliCourse AI</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2024 IntelliCourse AI. Built with Next.js, FastAPI & GPT-4o.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <Link href="/finder" className="hover:text-foreground">Course Finder</Link>
            <Link href="/settings" className="hover:text-foreground">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
