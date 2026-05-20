'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, MessageSquare } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { Navbar } from '@/components/Navbar'
import { ChatInput } from '@/components/ChatInput'
import { RecommendationPanel } from '@/components/RecommendationPanel'
import { Button } from '@/components/ui/button'
import { useSearch, useSavedCourses } from '@/hooks/useRecommendations'
import { api } from '@/lib/api'
import type { ChatMessage, CourseResult, SearchResponse } from '@/types'
import toast from 'react-hot-toast'

export default function FinderPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeResults, setActiveResults] = useState<SearchResponse | null>(null)
  const [compareList, setCompareList] = useState<CourseResult[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { isLoading, error, search } = useSearch()
  const { save, remove, isSaved } = useSavedCourses()
  const searchParams = useSearchParams()

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) handleSearch(q)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSearch = async (query: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: query, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])

    const result = await search(query)
    if (result) {
      setActiveResults(result)
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: result.clarification_needed
          ? result.clarification_question || 'Could you clarify?'
          : `Found ${result.total} courses matching your query. ${result.processing_time_ms ? `(${Math.round(result.processing_time_ms)}ms)` : ''}`,
        results: result.results,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])
    }
  }

  const handleSave = (course: CourseResult) => {
    if (isSaved(course.id)) { remove(course.id); toast('Course removed from saved') }
    else { save(course); toast.success('Course saved!') }
  }

  const handleCompare = (course: CourseResult) => {
    setCompareList((prev) => {
      if (prev.find((c) => c.id === course.id)) return prev
      if (prev.length >= 4) { toast('Max 4 courses for comparison'); return prev }
      toast.success('Added to comparison')
      return [...prev, course]
    })
  }

  const savedIds = new Set(useSavedCourses().saved.map((c) => c.id))

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 flex overflow-hidden">
          {/* Chat panel */}
          <div className="w-full md:w-96 flex flex-col border-r border-border bg-card/50">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">AI Course Chat</span>
              </div>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { setMessages([]); setActiveResults(null) }} className="text-xs h-7">
                  <Trash2 className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Ask the AI anything</p>
                  <p className="text-xs text-muted-foreground mt-1">Try &ldquo;Machine learning for beginners&rdquo;</p>
                </div>
              )}
              {messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                    <p className="text-sm">{msg.content}</p>
                    {msg.results && msg.results.length > 0 && (
                      <p className="text-xs opacity-70 mt-1">↳ {msg.results.length} results in right panel</p>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <ChatInput onSubmit={handleSearch} isLoading={isLoading} placeholder="Ask about courses, skills, careers..." />
            </div>
          </div>

          {/* Results panel */}
          <div className="flex-1 overflow-y-auto p-6 hidden md:block">
            {!activeResults && !isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                  <span className="text-2xl">🎓</span>
                </div>
                <h3 className="font-semibold mb-2">Ready to discover courses</h3>
                <p className="text-sm text-muted-foreground max-w-xs">Type your learning goal or career target in the chat panel to get AI-powered recommendations.</p>
              </div>
            ) : (
              <RecommendationPanel
                response={activeResults}
                isLoading={isLoading}
                error={error}
                onSave={handleSave}
                onCompare={handleCompare}
                savedIds={savedIds}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
