'use client'

import {
  createContext, useContext, useCallback, useEffect, useState, useRef,
  type ReactNode,
} from 'react'
import { api } from '@/lib/api'
import type { MemoryProfile, CourseResult } from '@/types'

// ── User identity ─────────────────────────────────────────────────────────────

function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'

  // Prefer the authenticated user's email stored during login
  try {
    const session = localStorage.getItem('ic_session')
    if (session) {
      const parsed = JSON.parse(session)
      if (parsed?.email) return parsed.email
    }
  } catch { /* ignore */ }

  // Fallback: stable anonymous UUID
  let id = localStorage.getItem('ic_anon_id')
  if (!id) {
    id = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`
    localStorage.setItem('ic_anon_id', id)
  }
  return id
}

// ── Context types ─────────────────────────────────────────────────────────────

interface MemoryContextValue {
  userId: string
  profile: MemoryProfile | null
  isLoading: boolean
  recordSearch: (query: string, results: CourseResult[]) => void
  recordSave: (course: CourseResult) => void
  recordView: (course: CourseResult) => void
  recordSkills: (skills: string[]) => void
  recordCareer: (career: string) => void
  recordLevel: (level: string) => void
  removeEntry: (index: number) => Promise<void>
  clearMemory: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const MemoryContext = createContext<MemoryContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function MemoryProvider({ children }: { children: ReactNode }) {
  const [userId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'anonymous'
    return getOrCreateUserId()
  })
  const [profile, setProfile] = useState<MemoryProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Debounce profile refreshes — avoid hammering on rapid interactions
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshProfile = useCallback(async () => {
    try {
      const data = await api.getMemory(userId)
      setProfile(data)
    } catch {
      // Memory service is best-effort; don't break the UI
    }
  }, [userId])

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(refreshProfile, 1500)
  }, [refreshProfile])

  // Initial load
  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  // ── Interaction recorders ─────────────────────────────────────────────────

  const recordSearch = useCallback((query: string, _results: CourseResult[]) => {
    // Backend records the search automatically when user_id is sent with /search
    // We refresh here to pick up any updates
    scheduleRefresh()
  }, [scheduleRefresh])

  const recordSave = useCallback((course: CourseResult) => {
    api.recordInteraction(userId, course.id, course.course_name, course.skills, 'save')
      .catch(() => {})
    scheduleRefresh()
  }, [userId, scheduleRefresh])

  const recordView = useCallback((course: CourseResult) => {
    api.recordInteraction(userId, course.id, course.course_name, course.skills, 'view')
      .catch(() => {})
    // Don't refresh on every view — too noisy
  }, [userId])

  const recordSkills = useCallback((skills: string[]) => {
    if (!skills.length) return
    api.recordMemorySkills(userId, skills).catch(() => {})
    scheduleRefresh()
  }, [userId, scheduleRefresh])

  const recordCareer = useCallback((career: string) => {
    if (!career.trim()) return
    api.recordMemoryCareer(userId, career).catch(() => {})
    scheduleRefresh()
  }, [userId, scheduleRefresh])

  const recordLevel = useCallback((level: string) => {
    if (!level.trim()) return
    api.recordMemoryLevel(userId, level).catch(() => {})
    scheduleRefresh()
  }, [userId, scheduleRefresh])

  const removeEntry = useCallback(async (index: number) => {
    await api.removeMemoryEntry(userId, index)
    await refreshProfile()
  }, [userId, refreshProfile])

  const clearMemory = useCallback(async () => {
    setIsLoading(true)
    try {
      await api.clearMemory(userId)
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  return (
    <MemoryContext.Provider value={{
      userId,
      profile,
      isLoading,
      recordSearch,
      recordSave,
      recordView,
      recordSkills,
      recordCareer,
      recordLevel,
      removeEntry,
      clearMemory,
      refreshProfile,
    }}>
      {children}
    </MemoryContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMemory(): MemoryContextValue {
  const ctx = useContext(MemoryContext)
  if (!ctx) throw new Error('useMemory must be used inside <MemoryProvider>')
  return ctx
}
