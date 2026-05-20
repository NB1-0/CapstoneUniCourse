'use client'
import { Star, X, Download } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { formatDifficulty } from '@/lib/utils'
import type { CourseResult } from '@/types'

interface CourseComparisonTableProps {
  courses: CourseResult[]
  onRemove?: (id: string) => void
}

const ROWS = [
  { key: 'organization', label: 'Provider' },
  { key: 'difficulty_level', label: 'Difficulty' },
  { key: 'rating', label: 'Rating' },
  { key: 'skills', label: 'Skills' },
  { key: 'prerequisites', label: 'Prerequisites' },
]

export function CourseComparisonTable({ courses, onRemove }: CourseComparisonTableProps) {
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl">
        <p className="text-sm font-medium">No courses to compare</p>
        <p className="text-xs text-muted-foreground mt-1">Add courses from the Course Finder to compare them side by side</p>
      </div>
    )
  }

  const exportCSV = () => {
    const headers = ['Course', 'Organization', 'Difficulty', 'Rating', 'Skills']
    const rows = courses.map((c) => [c.course_name, c.organization, c.difficulty_level, c.rating, c.skills.join('; ')])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'course-comparison.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const bestRating = Math.max(...courses.map((c) => c.rating))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-muted-foreground">Comparing {courses.length} course{courses.length !== 1 ? 's' : ''}</p>
        <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs h-8">
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left p-4 text-xs text-muted-foreground font-medium w-32">Feature</th>
              {courses.map((c) => (
                <th key={c.id} className="text-left p-4 min-w-[180px]">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs leading-snug line-clamp-2">{c.course_name}</span>
                    {onRemove && (
                      <button onClick={() => onRemove(c.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ key, label }) => (
              <tr key={key} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="p-4 text-xs text-muted-foreground font-medium">{label}</td>
                {courses.map((c) => {
                  const val = c[key as keyof CourseResult]
                  const isHighest = key === 'rating' && c.rating === bestRating
                  return (
                    <td key={c.id} className={`p-4 ${isHighest ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''}`}>
                      {key === 'rating' && (
                        <span className={`flex items-center gap-1 font-medium text-sm ${isHighest ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{c.rating.toFixed(1)}
                          {isHighest && <span className="text-xs">(Best)</span>}
                        </span>
                      )}
                      {key === 'difficulty_level' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${formatDifficulty(c.difficulty_level).bg} ${formatDifficulty(c.difficulty_level).color}`}>
                          {c.difficulty_level}
                        </span>
                      )}
                      {key === 'skills' && (
                        <div className="flex flex-wrap gap-1">
                          {(val as string[]).slice(0, 4).map((s: string) => (
                            <span key={s} className="skill-badge">{s}</span>
                          ))}
                          {(val as string[]).length > 4 && <span className="text-xs text-muted-foreground">+{(val as string[]).length - 4}</span>}
                        </div>
                      )}
                      {key === 'prerequisites' && (
                        <div>
                          {(val as string[]).length === 0
                            ? <span className="text-xs text-muted-foreground">None</span>
                            : (val as string[]).slice(0, 3).map((p: string) => <span key={p} className="text-xs bg-muted px-1.5 py-0.5 rounded mr-1">{p}</span>)
                          }
                        </div>
                      )}
                      {!['rating', 'difficulty_level', 'skills', 'prerequisites'].includes(key) && (
                        <span className="text-xs">{String(val)}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
