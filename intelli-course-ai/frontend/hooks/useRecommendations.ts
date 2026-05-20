'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { SearchResponse, RecommendResponse, CourseResult } from '@/types'

export function useSearch() {
  const [data, setData] = useState<SearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async (query: string, filters?: Record<string, unknown>) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await api.search(query, filters)
      setData(result)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Search failed'
      setError(msg)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, error, search }
}

export function useRecommend() {
  const [data, setData] = useState<RecommendResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recommend = async (goals: string, currentSkills: string[], targetSkills: string[]) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await api.recommend(goals, currentSkills, targetSkills)
      setData(result)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Recommendation failed'
      setError(msg)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, error, recommend }
}

export function useSavedCourses() {
  const [saved, setSaved] = useState<CourseResult[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem('savedCourseData') || '[]')
    } catch { return [] }
  })

  const save = (course: CourseResult) => {
    setSaved((prev) => {
      if (prev.find((c) => c.id === course.id)) return prev
      const updated = [...prev, course]
      localStorage.setItem('savedCourseData', JSON.stringify(updated))
      return updated
    })
  }

  const remove = (id: string) => {
    setSaved((prev) => {
      const updated = prev.filter((c) => c.id !== id)
      localStorage.setItem('savedCourseData', JSON.stringify(updated))
      return updated
    })
  }

  const isSaved = (id: string) => saved.some((c) => c.id === id)

  return { saved, save, remove, isSaved }
}
