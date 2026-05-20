'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, BookOpen, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, ExternalLink, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn, formatDifficulty, formatRating, truncateText } from '@/lib/utils'
import type { CourseResult } from '@/types'

interface CourseCardProps {
  course: CourseResult
  onSave?: (course: CourseResult) => void
  onCompare?: (course: CourseResult) => void
  isSaved?: boolean
  compact?: boolean
}

export function CourseCard({ course, onSave, onCompare, isSaved = false, compact = false }: CourseCardProps) {
  const [expanded, setExpanded] = useState(false)
  const diff = formatDifficulty(course.difficulty_level)
  const MAX_SKILLS = 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="group relative rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* Difficulty color bar */}
      <div className={cn('h-1 w-full', {
        'bg-gradient-to-r from-emerald-400 to-emerald-600': course.difficulty_level === 'Beginner',
        'bg-gradient-to-r from-amber-400 to-amber-600': course.difficulty_level === 'Intermediate',
        'bg-gradient-to-r from-rose-400 to-rose-600': course.difficulty_level === 'Advanced',
        'bg-gradient-to-r from-blue-400 to-purple-600': !['Beginner','Intermediate','Advanced'].includes(course.difficulty_level),
      })} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {course.course_name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{course.organization}</p>
          </div>
          <button
            onClick={() => onSave?.(course)}
            className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
            title={isSaved ? 'Unsave' : 'Save'}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>

        {/* Rating + Difficulty */}
        <div className="flex items-center gap-2 mb-3">
          <div className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', diff.bg, diff.color)}>
            {diff.label}
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <Star className="w-3 h-3 fill-current" />
            <span className="font-medium text-foreground">{formatRating(course.rating)}</span>
          </div>
          {course.relevance_score > 0 && (
            <div className="ml-auto text-xs text-muted-foreground">
              {Math.round(course.relevance_score * 100)}% match
            </div>
          )}
        </div>

        {/* Relevance bar */}
        {course.relevance_score > 0 && (
          <Progress value={course.relevance_score * 100} className="h-1 mb-3" />
        )}

        {/* Description */}
        {!compact && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {truncateText(course.description, 140)}
          </p>
        )}

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {course.skills.slice(0, MAX_SKILLS).map((skill) => (
            <span
              key={skill}
              className={cn('skill-badge', course.matched_skills?.includes(skill) && 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 font-semibold')}
            >
              {skill}
            </span>
          ))}
          {course.skills.length > MAX_SKILLS && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-muted-foreground bg-muted border">
              +{course.skills.length - MAX_SKILLS}
            </span>
          )}
        </div>

        {/* Expandable section */}
        {course.why_recommended && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Less' : 'Why recommended'}
            </button>

            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-2 overflow-hidden">
                <p className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg italic">
                  &ldquo;{course.why_recommended}&rdquo;
                </p>
                {course.prerequisites?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Prerequisites:</p>
                    <div className="flex flex-wrap gap-1">
                      {course.prerequisites.map((p) => (
                        <span key={p} className="text-xs bg-muted px-2 py-0.5 rounded">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
          {onCompare && (
            <Button variant="outline" size="sm" onClick={() => onCompare(course)} className="flex-1 text-xs h-8">
              <Plus className="w-3 h-3 mr-1" /> Compare
            </Button>
          )}
          {course.course_url && (
            <Button variant="ghost" size="sm" className="flex-1 text-xs h-8" asChild>
              <a href={course.course_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 mr-1" /> View
              </a>
            </Button>
          )}
          {!course.course_url && (
            <Button variant="ghost" size="sm" className="flex-1 text-xs h-8" onClick={() => onSave?.(course)}>
              <BookOpen className="w-3 h-3 mr-1" /> Enroll
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
