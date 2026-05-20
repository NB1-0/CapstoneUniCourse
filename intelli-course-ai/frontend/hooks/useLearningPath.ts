'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { LearningPathResponse, SkillGapResponse, CareerAlignResponse } from '@/types'

export function useLearningPath() {
  const [data, setData] = useState<LearningPathResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async (goal: string, level: string, maxCourses?: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await api.getLearningPath(goal, level, maxCourses)
      setData(result)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to generate learning path'
      setError(msg)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, error, generate, setData }
}

export function useSkillGap() {
  const [data, setData] = useState<SkillGapResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = async (targetRole: string, currentSkills: string[]) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await api.getSkillGap(targetRole, currentSkills)
      setData(result)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Skill gap analysis failed'
      setError(msg)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, error, analyze }
}

export function useCareerAlign() {
  const [data, setData] = useState<CareerAlignResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const align = async (careerGoal: string, currentSkills: string[]) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await api.getCareerAlign(careerGoal, currentSkills)
      setData(result)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Career alignment failed'
      setError(msg)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, error, align }
}

export function useSkillProfile() {
  const [skills, setSkills] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('userSkills') || '[]') } catch { return [] }
  })

  const addSkill = (skill: string) => {
    setSkills((prev) => {
      if (prev.includes(skill)) return prev
      const updated = [...prev, skill]
      localStorage.setItem('userSkills', JSON.stringify(updated))
      return updated
    })
  }

  const removeSkill = (skill: string) => {
    setSkills((prev) => {
      const updated = prev.filter((s) => s !== skill)
      localStorage.setItem('userSkills', JSON.stringify(updated))
      return updated
    })
  }

  return { skills, addSkill, removeSkill }
}
