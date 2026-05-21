'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, X, Trash2, RotateCcw, ChevronDown, ChevronUp,
  Search, Bookmark, Lightbulb, Target, Layers, Clock,
  AlertTriangle,
} from 'lucide-react'
import { useMemory } from '@/contexts/MemoryContext'
import type { MemoryEntry } from '@/types'

// ── Entry type display helpers ────────────────────────────────────────────────

const ENTRY_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  search:  { label: 'Search',  icon: Search,   color: 'text-blue-400' },
  save:    { label: 'Saved',   icon: Bookmark,  color: 'text-green-400' },
  view:    { label: 'Viewed',  icon: Clock,     color: 'text-muted-foreground' },
  skill:   { label: 'Skill',   icon: Lightbulb, color: 'text-yellow-400' },
  career:  { label: 'Career',  icon: Target,    color: 'text-purple-400' },
  level:   { label: 'Level',   icon: Layers,    color: 'text-orange-400' },
}

function formatTs(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function SkillChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs font-medium">
      {label}
    </span>
  )
}

function EntryRow({ entry, index, onRemove }: {
  entry: MemoryEntry
  index: number
  onRemove: (i: number) => void
}) {
  const meta = ENTRY_META[entry.type] ?? ENTRY_META.search
  const Icon = meta.icon
  return (
    <div className="flex items-start gap-2 group py-1.5 px-2 rounded-lg hover:bg-accent/50 transition-colors">
      <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${meta.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground truncate">{entry.content}</p>
        <p className="text-[10px] text-muted-foreground">{meta.label} · {formatTs(entry.timestamp)}</p>
      </div>
      <button
        onClick={() => onRemove(index)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex-shrink-0"
        title="Remove this entry"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Clear confirmation dialog ──────────────────────────────────────────────────

function ClearConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-xl p-4"
    >
      <div className="text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
        <p className="text-sm font-medium">Forget everything?</p>
        <p className="text-xs text-muted-foreground">All personalisation data will be permanently deleted.</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            Yes, forget all
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

interface MemoryPanelProps {
  onClose: () => void
}

export function MemoryPanel({ onClose }: MemoryPanelProps) {
  const { profile, isLoading, removeEntry, clearMemory, refreshProfile } = useMemory()
  const [showHistory, setShowHistory] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)

  async function handleRemove(index: number) {
    setRemoving(index)
    try { await removeEntry(index) } finally { setRemoving(null) }
  }

  async function handleClear() {
    await clearMemory()
    setConfirmClear(false)
    onClose()
  }

  const entries = profile?.entries ?? []
  const totalInteractions = profile?.total_interactions ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="relative w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
    >
      <AnimatePresence>
        {confirmClear && (
          <ClearConfirm onConfirm={handleClear} onCancel={() => setConfirmClear(false)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-gradient-to-r from-purple-500/10 to-blue-500/10">
        <Brain className="w-4 h-4 text-purple-400" />
        <span className="font-semibold text-sm flex-1">What I remember</span>
        {totalInteractions > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">
            {totalInteractions} interactions
          </span>
        )}
        <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors ml-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {!profile || totalInteractions === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Brain className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground text-xs">No memory yet.</p>
            <p className="text-muted-foreground/60 text-xs">Start searching and saving courses — I&apos;ll learn your preferences.</p>
          </div>
        ) : (
          <>
            {/* Inferred skills */}
            {profile.inferred_skills.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.inferred_skills.map((s) => <SkillChip key={s} label={s} />)}
                </div>
              </div>
            )}

            {/* Career + level */}
            {(profile.inferred_career || profile.inferred_level) && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Goals</p>
                {profile.inferred_career && (
                  <div className="flex items-center gap-2 text-xs">
                    <Target className="w-3.5 h-3.5 text-purple-400" />
                    <span>{profile.inferred_career}</span>
                  </div>
                )}
                {profile.inferred_level && (
                  <div className="flex items-center gap-2 text-xs">
                    <Layers className="w-3.5 h-3.5 text-orange-400" />
                    <span>{profile.inferred_level}</span>
                  </div>
                )}
              </div>
            )}

            {/* Recent searches */}
            {profile.recent_searches.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Searches</p>
                <ul className="space-y-0.5">
                  {profile.recent_searches.slice(0, 5).map((q, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Search className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Saved courses */}
            {profile.recent_saves.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Saved Courses</p>
                <ul className="space-y-0.5">
                  {profile.recent_saves.map((name, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Bookmark className="w-3 h-3 flex-shrink-0 text-green-400" />
                      <span className="truncate">{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Entry history (toggle) */}
            {entries.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showHistory ? 'Hide' : 'Show'} full history ({entries.length})
                </button>

                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-2 space-y-0.5"
                    >
                      {entries.map((entry, i) => (
                        <EntryRow
                          key={i}
                          entry={entry}
                          index={i}
                          onRemove={handleRemove}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-2">
        <button
          onClick={refreshProfile}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Refresh
        </button>
        <div className="flex-1" />
        {totalInteractions > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Forget everything
          </button>
        )}
      </div>
    </motion.div>
  )
}
