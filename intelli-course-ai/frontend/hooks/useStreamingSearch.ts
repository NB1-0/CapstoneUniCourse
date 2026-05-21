'use client'

/**
 * useStreamingSearch — progressive SSE search hook.
 *
 * Connects to GET /api/stream/search via EventSource (HTTP/1.1 SSE).
 * Results arrive in stages:
 *   bm25      → keyword results (fast, ~10-50ms)
 *   reranking → merge in progress
 *   final     → full reranked results
 *   done      → stream closed
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { CourseResult } from '@/types'

export type StreamStage =
  | 'idle'
  | 'connecting'
  | 'bm25'
  | 'reranking'
  | 'final'
  | 'done'
  | 'error'

export interface StreamingSearchState {
  stage: StreamStage
  results: CourseResult[]
  isStreaming: boolean
  processingTimeMs: number | null
  error: string | null
  elapsedMs: number | null    // time of last event
}

interface StreamEvent {
  type: string
  query?: string
  results?: CourseResult[]
  count?: number
  total?: number
  processing_time_ms?: number
  elapsed_ms?: number
  message?: string
}

const API_BASE =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL}/api`
      : '/api'
    : 'http://localhost:8000/api'

export function useStreamingSearch() {
  const [state, setState] = useState<StreamingSearchState>({
    stage: 'idle',
    results: [],
    isStreaming: false,
    processingTimeMs: null,
    error: null,
    elapsedMs: null,
  })

  const esRef = useRef<EventSource | null>(null)

  const cancel = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setState((s) => ({ ...s, stage: 'idle', isStreaming: false }))
  }, [])

  // Cleanup on unmount
  useEffect(() => () => { esRef.current?.close() }, [])

  const search = useCallback((
    query: string,
    opts: { userId?: string; topK?: number; difficulty?: string; minRating?: number } = {},
  ) => {
    // Cancel any in-progress stream
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    setState({
      stage: 'connecting',
      results: [],
      isStreaming: true,
      processingTimeMs: null,
      error: null,
      elapsedMs: null,
    })

    const params = new URLSearchParams({ query, top_k: String(opts.topK ?? 10) })
    if (opts.userId) params.set('user_id', opts.userId)
    if (opts.difficulty) params.set('difficulty', opts.difficulty)
    if (opts.minRating != null) params.set('min_rating', String(opts.minRating))

    const es = new EventSource(`${API_BASE}/stream/search?${params}`)
    esRef.current = es

    es.onmessage = (e: MessageEvent) => {
      try {
        const event: StreamEvent = JSON.parse(e.data)

        switch (event.type) {
          case 'start':
            setState((s) => ({ ...s, stage: 'connecting' }))
            break

          case 'bm25':
            setState((s) => ({
              ...s,
              stage: 'bm25',
              results: event.results ?? s.results,
              elapsedMs: event.elapsed_ms ?? null,
            }))
            break

          case 'reranking':
            setState((s) => ({
              ...s,
              stage: 'reranking',
              elapsedMs: event.elapsed_ms ?? null,
            }))
            break

          case 'final':
            setState((s) => ({
              ...s,
              stage: 'final',
              results: event.results ?? s.results,
              processingTimeMs: event.processing_time_ms ?? null,
            }))
            break

          case 'done':
            setState((s) => ({ ...s, stage: 'done', isStreaming: false }))
            es.close()
            esRef.current = null
            break

          case 'error':
            setState((s) => ({
              ...s,
              stage: 'error',
              isStreaming: false,
              error: event.message ?? 'Unknown error',
            }))
            es.close()
            esRef.current = null
            break
        }
      } catch {
        // ignore malformed frames
      }
    }

    es.onerror = () => {
      setState((s) => ({
        ...s,
        stage: 'error',
        isStreaming: false,
        error: 'Connection to server lost',
      }))
      es.close()
      esRef.current = null
    }
  }, [])

  return { ...state, search, cancel }
}
