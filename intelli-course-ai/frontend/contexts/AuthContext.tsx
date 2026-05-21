'use client'
import { createContext, useContext, useState, useEffect } from 'react'

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const SESSION_KEY = 'ic_session'
const USERS_KEY = 'ic_users'

function hashPass(p: string): string {
  let h = 0
  for (let i = 0; i < p.length; i++) {
    h = Math.imul(31, h) + p.charCodeAt(i) | 0
  }
  return Math.abs(h).toString(36)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {}
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const users: Array<User & { ph: string }> = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!found) throw new Error('No account found with this email. Please sign up first.')
    if (found.ph !== hashPass(password)) throw new Error('Incorrect password. Please try again.')
    const { ph: _, ...userData } = found
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData))
    setUser(userData)
  }

  const signup = async (name: string, email: string, password: string) => {
    const users: Array<User & { ph: string }> = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists. Please log in.')
    }
    const newUser: User & { ph: string } = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
      ph: hashPass(password),
    }
    users.push(newUser)
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    const { ph: _, ...userData } = newUser
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
