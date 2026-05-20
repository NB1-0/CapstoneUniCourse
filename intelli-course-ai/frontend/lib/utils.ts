import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDifficulty(level: string): { label: string; color: string; bg: string } {
  const l = level?.toLowerCase() || ''
  if (l === 'beginner') return { label: 'Beginner', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800' }
  if (l === 'intermediate') return { label: 'Intermediate', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800' }
  if (l === 'advanced') return { label: 'Advanced', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800' }
  return { label: level || 'Mixed', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' }
}

export function formatRating(rating: number): string {
  return rating?.toFixed(1) ?? '0.0'
}

export function getPhaseColor(phase: string): string {
  const p = phase?.toLowerCase() || ''
  if (p === 'beginner') return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
  if (p === 'intermediate') return 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 border-amber-200 dark:border-amber-800'
  if (p === 'advanced') return 'text-rose-600 bg-rose-50 dark:bg-rose-950 dark:text-rose-400 border-rose-200 dark:border-rose-800'
  return 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400'
}

export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function renderStars(rating: number): string {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5 ? 1 : 0
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half)
}

export function getSavedCourses(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('savedCourses') || '[]') } catch { return [] }
}

export function saveCourse(id: string) {
  const saved = getSavedCourses()
  if (!saved.includes(id)) {
    localStorage.setItem('savedCourses', JSON.stringify([...saved, id]))
  }
}

export function unsaveCourse(id: string) {
  const saved = getSavedCourses().filter((s) => s !== id)
  localStorage.setItem('savedCourses', JSON.stringify(saved))
}

export function isCoursesSaved(id: string): boolean {
  return getSavedCourses().includes(id)
}
