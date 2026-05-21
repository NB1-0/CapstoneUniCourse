'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
  { label: 'Contains a letter', test: (p: string) => /[a-zA-Z]/.test(p) },
]

export default function SignupPage() {
  const router = useRouter()
  const { signup } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passOk = PASSWORD_RULES.every(r => r.test(password))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Please enter your full name.'); return }
    if (!email.trim()) { setError('Please enter your email.'); return }
    if (!passOk) { setError('Password does not meet the requirements.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await signup(name, email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-purple-500/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-blue-500/8 blur-3xl" />
      </div>

      <div className="p-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <GraduationCap className="w-3 h-3 text-white" />
          </div>
          IntelliCourse AI
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-muted-foreground text-sm mt-2">Start your AI-powered learning journey today</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} className="pl-10" autoComplete="name" required />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" autoComplete="email" required />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" autoComplete="new-password" required />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password strength */}
                {password && (
                  <div className="space-y-1 pt-1">
                    {PASSWORD_RULES.map(rule => (
                      <div key={rule.label} className="flex items-center gap-1.5">
                        <CheckCircle className={`w-3 h-3 ${rule.test(password) ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
                        <span className={`text-[11px] ${rule.test(password) ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} className={`pl-10 ${confirm && confirm !== password ? 'border-red-400' : ''}`} autoComplete="new-password" required />
                </div>
                {confirm && confirm !== password && (
                  <p className="text-[11px] text-red-500">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Account'} {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/dashboard')}>
              Continue without account
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-5">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Your data stays in your browser. No tracking, no server-side accounts.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
