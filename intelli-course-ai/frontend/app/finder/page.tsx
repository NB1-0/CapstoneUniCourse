'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, MessageSquare, Zap, ZapOff, Loader2 } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { Navbar } from '@/components/Navbar'
import { ChatInput } from '@/components/ChatInput'
import { RecommendationPanel } from '@/components/RecommendationPanel'
import { Button } from '@/components/ui/button'
import { useSearch, useSavedCourses } from '@/hooks/useRecommendations'
import { useStreamingSearch, type StreamStage } from '@/hooks/useStreamingSearch'
import { useMemory } from '@/contexts/MemoryContext'
import { api } from '@/lib/api'
import type { ChatMessage, CourseResult, SearchResponse } from '@/types'
import toast from 'react-hot-toast'

// ── Stream progress bar ───────────────────────────────────────────────────────

const STAGES: { id: StreamStage; label: string }[] = [
  { id: 'connecting', label: 'Connecting' },
  { id: 'bm25',       label: 'Keyword' },
  { id: 'reranking',  label: 'Semantic' },
  { id: 'final',      label: 'Reranked' },
]

function StreamProgress({ stage, processingTimeMs }: { stage: StreamStage; processingTimeMs: number | null }) {
  const activeIdx = STAGES.findIndex((s) => s.id === stage)
  const isDone    = stage === 'done' || stage === 'final'

  return (
    <div className="px-4 py-2 border-b border-border bg-muted/30">
      <div className="flex items-center gap-1.5 mb-1.5">
        {STAGES.map((s, i) => {
          const past   = i < activeIdx || isDone
          const active = s.id === stage && !isDone
          return (
            <div key={s.id} className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full transition-all ${
                past   ? 'bg-green-500/20 text-green-400' :
                active ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                         'bg-muted text-muted-foreground'
              }`}>
                {active && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                {past   && <span>✓</span>}
                {s.label}
              </div>
              {i < STAGES.length - 1 && (
                <div className={`h-px w-3 ${past || (active && i > 0) ? 'bg-green-500/40' : 'bg-muted'}`} />
              )}
            </div>
          )
        })}
      </div>
      {processingTimeMs != null && isDone && (
        <p className="text-[10px] text-muted-foreground">
          Completed in {processingTimeMs.toFixed(0)} ms
        </p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinderPage() {
  const [sidebarCollapsed, setSidebarCollapsed]   = useState(false)
  const [messages, setMessages]                   = useState<ChatMessage[]>([])
  const [activeResults, setActiveResults]         = useState<SearchResponse | null>(null)
  const [compareList, setCompareList]             = useState<CourseResult[]>([])
  const [streamingEnabled, setStreamingEnabled]   = useState(true)
  const messagesEndRef                            = useRef<HTMLDivElement>(null)

  // Non-streaming path
  const { isLoading, error, search }     = useSearch()
  const { save, remove, isSaved }        = useSavedCourses()
  const { userId, recordSave, recordSearch } = useMemory()
  const searchParams                     = useSearchParams()

  // Streaming path
  const streaming = useStreamingSearch()

  const isAnyLoading = isLoading || streaming.isStreaming

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) handleSearch(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Keep results panel in sync with streaming state
  useEffect(() => {
    if (streamingEnabled && (streaming.results.length > 0 || streaming.stage === 'done')) {
      setActiveResults({
        query: '',
        results: streaming.results,
        total: streaming.results.length,
        clarification_needed: false,
        processing_time_ms: streaming.processingTimeMs ?? 0,
      })
    }
  }, [streamingEnabled, streaming.results, streaming.stage, streaming.processingTimeMs])

  const handleSearch = async (query: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: query, timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])

    if (streamingEnabled) {
      // ── Streaming path ────────────────────────────────────────────────────
      setActiveResults(null)
      streaming.search(query, { userId, topK: 10 })

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: 'Streaming results — keyword matches appear first, then semantically reranked results.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])
      recordSearch(query, [])
    } else {
      // ── Non-streaming path ────────────────────────────────────────────────
      const result = await search(query, undefined, userId)
      if (result) {
        setActiveResults(result)
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(), role: 'assistant',
          content: result.clarification_needed
            ? result.clarification_question || 'Could you clarify?'
            : `Found ${result.total} courses. (${Math.round(result.processing_time_ms ?? 0)} ms)`,
          results: result.results,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMsg])
        recordSearch(query, result.results)
      }
    }
  }

  const handleSave = (course: CourseResult) => {
    if (isSaved(course.id)) {
      remove(course.id)
      toast('Course removed from saved')
    } else {
      save(course)
      recordSave(course)
      toast.success('Course saved!')
    }
  }

  const handleCompare = (course: CourseResult) => {
    setCompareList((prev) => {
      if (prev.find((c) => c.id === course.id)) return prev
      if (prev.length >= 4) { toast('Max 4 courses for comparison'); return prev }
      toast.success('Added to comparison')
      return [...prev, course]
    })
  }

  const handleClear = () => {
    setMessages([])
    setActiveResults(null)
    streaming.cancel()
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

            {/* Chat header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">AI Course Chat</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Streaming toggle */}
                <button
                  onClick={() => { streaming.cancel(); setStreamingEnabled((v) => !v) }}
                  title={streamingEnabled ? 'Disable streaming' : 'Enable streaming'}
                  className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border transition-all ${
                    streamingEnabled
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {streamingEnabled ? <Zap className="w-3 h-3" /> : <ZapOff className="w-3 h-3" />}
                  {streamingEnabled ? 'Streaming' : 'Batch'}
                </button>

                {messages.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs h-7">
                    <Trash2 className="w-3 h-3 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Stream progress bar */}
            <AnimatePresence>
              {streamingEnabled && streaming.isStreaming && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <StreamProgress stage={streaming.stage} processingTimeMs={streaming.processingTimeMs} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Ask the AI anything</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try &ldquo;Machine learning for beginners&rdquo;
                  </p>
                  {streamingEnabled && (
                    <p className="text-[10px] text-blue-400 mt-2 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> Streaming mode — results appear progressively
                    </p>
                  )}
                </div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                    <p className="text-sm">{msg.content}</p>
                    {msg.results && msg.results.length > 0 && (
                      <p className="text-xs opacity-70 mt-1">↳ {msg.results.length} results in right panel</p>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Streaming indicator in chat */}
              <AnimatePresence>
                {streamingEnabled && streaming.isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-start"
                  >
                    <div className="chat-bubble-ai flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      <span className="text-xs text-muted-foreground">
                        {streaming.stage === 'bm25'
                          ? `${streaming.results.length} keyword matches — running semantic search…`
                          : streaming.stage === 'reranking'
                          ? 'Reranking with AI…'
                          : 'Connecting…'}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <ChatInput
                onSubmit={handleSearch}
                isLoading={isAnyLoading}
                placeholder="Ask about courses, skills, careers…"
              />
            </div>
          </div>

          {/* Results panel */}
          <div className="flex-1 overflow-y-auto p-6 hidden md:block">
            {!activeResults && !isAnyLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                  <span className="text-2xl">🎓</span>
                </div>
                <h3 className="font-semibold mb-2">Ready to discover courses</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Type your learning goal or career target in the chat panel to get AI-powered recommendations.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Streaming status chip */}
                <AnimatePresence>
                  {streamingEnabled && streaming.isStreaming && streaming.results.length > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-blue-400 flex items-center gap-1 pb-1"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Showing {streaming.results.length} preliminary results — reranking in progress…
                    </motion.p>
                  )}
                </AnimatePresence>

                <RecommendationPanel
                  response={activeResults}
                  isLoading={isLoading || (streamingEnabled && streaming.stage === 'connecting')}
                  error={error ?? (streaming.error ?? null)}
                  onSave={handleSave}
                  onCompare={handleCompare}
                  savedIds={savedIds}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
