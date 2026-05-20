'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bookmark, Trash2, Download, GitCompare } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { Navbar } from '@/components/Navbar'
import { CourseCard } from '@/components/CourseCard'
import { CourseComparisonTable } from '@/components/CourseComparisonTable'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSavedCourses } from '@/hooks/useRecommendations'
import type { CourseResult } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function SavedPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [compareList, setCompareList] = useState<CourseResult[]>([])
  const { saved, remove } = useSavedCourses()

  const handleRemove = (id: string) => { remove(id); toast('Course removed') }
  const clearAll = () => { saved.forEach((c) => remove(c.id)); toast('All courses cleared') }

  const toggleCompare = (course: CourseResult) => {
    setCompareList((prev) => {
      if (prev.find((c) => c.id === course.id)) return prev.filter((c) => c.id !== course.id)
      if (prev.length >= 4) { toast('Max 4 courses'); return prev }
      return [...prev, course]
    })
  }

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'saved-courses.json'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported!')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="page-header flex items-center gap-2"><Bookmark className="w-6 h-6 text-primary" /> Saved Courses</h1>
                <p className="text-muted-foreground text-sm mt-1">{saved.length} course{saved.length !== 1 ? 's' : ''} saved</p>
              </div>
              {saved.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportJSON}><Download className="w-4 h-4 mr-1" /> Export</Button>
                  <Button variant="outline" size="sm" onClick={clearAll} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4 mr-1" /> Clear All</Button>
                </div>
              )}
            </div>

            {saved.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4"><Bookmark className="w-8 h-8 text-muted-foreground" /></div>
                <h3 className="font-semibold mb-2">No saved courses yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Find courses and bookmark them to access them here.</p>
                <Link href="/finder"><Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Find Courses</Button></Link>
              </div>
            ) : (
              <Tabs defaultValue="grid">
                <TabsList>
                  <TabsTrigger value="grid">Grid View</TabsTrigger>
                  <TabsTrigger value="compare">
                    <GitCompare className="w-3.5 h-3.5 mr-1" /> Compare {compareList.length > 0 && `(${compareList.length})`}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="grid" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {saved.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        onSave={() => handleRemove(course.id)}
                        onCompare={toggleCompare}
                        isSaved
                      />
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="compare" className="mt-4">
                  <p className="text-xs text-muted-foreground mb-4">Select up to 4 courses from grid view to compare</p>
                  <CourseComparisonTable courses={compareList} onRemove={(id) => setCompareList((prev) => prev.filter((c) => c.id !== id))} />
                </TabsContent>
              </Tabs>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
