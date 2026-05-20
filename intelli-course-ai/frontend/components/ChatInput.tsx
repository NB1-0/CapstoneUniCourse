'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SUGGESTED_QUERIES = [
  'Machine learning from scratch',
  'Data science career path',
  'Python for data engineers',
  'Deep learning courses',
  'Cloud computing AWS',
  'NLP with transformers',
]

interface ChatInputProps {
  onSubmit: (query: string) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
}

export function ChatInput({ onSubmit, isLoading = false, placeholder = 'Ask about courses, skills, or career paths...', className }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 200) + 'px'
    }
  }

  useEffect(() => { adjustHeight() }, [value])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!value.trim() || isLoading) return
    onSubmit(value.trim())
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit()
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Input area */}
      <div className={cn('relative rounded-xl border bg-card shadow-sm input-glow transition-all', isLoading && 'opacity-75')}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={2}
          className="w-full resize-none rounded-xl bg-transparent px-4 py-3 pr-14 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
          style={{ minHeight: 72 }}
        />
        <div className="absolute right-3 bottom-3">
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading}
            size="icon"
            className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md shadow-blue-500/30 disabled:opacity-40"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <div className="absolute left-4 bottom-3 text-xs text-muted-foreground hidden sm:block">
          Ctrl+Enter to send
        </div>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Try:
        </span>
        {SUGGESTED_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => { setValue(q); textareaRef.current?.focus() }}
            disabled={isLoading}
            className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Loading indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ delay: i * 0.15, repeat: Infinity, duration: 0.6 }}
                />
              ))}
            </div>
            AI is thinking...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
