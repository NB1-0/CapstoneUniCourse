'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Filter, BookOpen, Clock, SlidersHorizontal } from 'lucide-react'
import { CourseCard } from '@/components/CourseCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/lib/utils'
import type { CourseResult, SearchResponse } from '@/types'

interface RecommendationPanelProps {
  response: SearchResponse | null
  isLoading?: boolean
  error?: string | null
  onSave?: (course: CourseResult) => void
  onCompare?: (course: CourseResult) => void
  savedIds?: Set<string>
}

const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced']

export function RecommendationPanel({ response, isLoading, error, onSave, onCompare, savedIds }: RecommendationPanelProps) {
  const [diffFilter, setDiffFilter] = useState('All')
  const [minRating, setMinRating] = useState(0)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
          <span className="text-destructive text-xl">!</span>
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Something went wrong</p>
        <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => <Skeleton key={d} className="h-8 w-20 rounded-full" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!response) return null

  if (response.clarification_needed) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 rounded-xl border bg-card text-center">
        <p className="text-sm font-medium mb-2">Could you clarify your request?</p>
        <p className="text-sm text-muted-foreground">{response.clarification_question}</p>
      </motion.div>
    )
  }

  const filtered = response.results.filter((r) => {
    if (diffFilter !== 'All' && r.difficulty_level !== diffFilter) return false
    if (r.rating < minRating) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-medium">
            {response.total} course{response.total !== 1 ? 's' : ''} found
            {response.query && <span className="text-muted-foreground"> for &ldquo;{response.query}&rdquo;</span>}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" /> {formatTime(response.processing_time_ms)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => setDiffFilter(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${diffFilter === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}
          >
            {d}
          </button>
        ))}
        <select
          value={minRating}
          onChange={(e) => setMinRating(Number(e.target.value))}
          className="text-xs px-2 py-1 rounded-lg border border-border bg-background ml-auto"
        >
          <option value={0}>Any Rating</option>
          <option value={4}>4.0+</option>
          <option value={4.5}>4.5+</option>
          <option value={4.7}>4.7+</option>
        </select>
      </div>

      {/* Results grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No courses match your filters</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting the difficulty or rating filter</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } }, hidden: {} }}
        >
          {filtered.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onSave={onSave}
              onCompare={onCompare}
              isSaved={savedIds?.has(course.id)}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}
