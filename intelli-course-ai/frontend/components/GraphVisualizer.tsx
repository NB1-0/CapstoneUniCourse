'use client'
import { useRef, useEffect, useCallback } from 'react'
import type { VizNode, VizEdge } from '@/types'

const NODE_COLORS: Record<string, string> = {
  Course: '#3b82f6',
  Skill: '#10b981',
  Career: '#f59e0b',
  Domain: '#8b5cf6',
  LearningLevel: '#64748b',
}

const EDGE_COLORS: Record<string, string> = {
  TEACHES: '#3b82f6',
  REQUIRES: '#ef4444',
  ADVANCES_TO: '#10b981',
  RELATED_TO: '#8b5cf6',
  LEADS_TO: '#f59e0b',
  BELONGS_TO: '#64748b',
}

interface SimNode {
  id: string
  label: string
  type: string
  properties: Record<string, unknown>
  x: number
  y: number
  vx: number
  vy: number
  fx?: number
  fy?: number
  radius: number
  degree: number
}

interface SimEdge {
  source: SimNode
  target: SimNode
  type: string
}

interface State {
  nodes: SimNode[]
  edges: SimEdge[]
  animId: number
  tick: number
  dragging: SimNode | null
  hovered: SimNode | null
  selected: SimNode | null
  zoom: number
  panX: number
  panY: number
  isPanning: boolean
  panStartX: number
  panStartY: number
  panOriginX: number
  panOriginY: number
  isDraggingNode: boolean
  mouseX: number
  mouseY: number
}

interface Props {
  nodes: VizNode[]
  edges: VizEdge[]
  onNodeClick?: (node: VizNode) => void
  className?: string
}

const REPULSION = 1800
const SPRING_K = 0.018
const SPRING_L = 90
const GRAVITY = 0.004
const DAMPING = 0.87
const MAX_TICKS = 280

export function GraphVisualizer({ nodes, edges, onNodeClick, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<State>({
    nodes: [], edges: [], animId: 0, tick: 0,
    dragging: null, hovered: null, selected: null,
    zoom: 1, panX: 0, panY: 0,
    isPanning: false, panStartX: 0, panStartY: 0,
    panOriginX: 0, panOriginY: 0,
    isDraggingNode: false, mouseX: 0, mouseY: 0,
  })

  const toWorld = (sx: number, sy: number, s: State, dpr: number) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const cx = (sx - rect.left) * dpr
    const cy = (sy - rect.top) * dpr
    return {
      x: (cx - s.panX) / s.zoom,
      y: (cy - s.panY) / s.zoom,
    }
  }

  const nodeAt = (wx: number, wy: number): SimNode | null => {
    const { nodes } = stateRef.current
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      const dx = wx - n.x, dy = wy - n.y
      if (dx * dx + dy * dy <= (n.radius + 4) ** 2) return n
    }
    return null
  }

  const simulate = (s: State, cx: number, cy: number) => {
    const alpha = Math.max(0.1, 1 - s.tick / MAX_TICKS)

    // Repulsion
    for (let i = 0; i < s.nodes.length; i++) {
      for (let j = i + 1; j < s.nodes.length; j++) {
        const a = s.nodes[i], b = s.nodes[j]
        const dx = b.x - a.x || 0.1
        const dy = b.y - a.y || 0.1
        const d2 = dx * dx + dy * dy
        const d = Math.sqrt(d2) || 1
        const f = (REPULSION * alpha) / d2
        const fx = f * dx / d, fy = f * dy / d
        if (a.fx === undefined) { a.vx -= fx; a.vy -= fy }
        if (b.fx === undefined) { b.vx += fx; b.vy += fy }
      }
    }

    // Springs
    for (const e of s.edges) {
      const a = e.source, b = e.target
      const dx = b.x - a.x, dy = b.y - a.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      const f = (d - SPRING_L) * SPRING_K * alpha
      const fx = f * dx / d, fy = f * dy / d
      if (a.fx === undefined) { a.vx += fx; a.vy += fy }
      if (b.fx === undefined) { b.vx -= fx; b.vy -= fy }
    }

    // Gravity + integrate
    for (const n of s.nodes) {
      if (n.fx !== undefined) {
        n.x = n.fx; n.y = n.fy!
        n.vx = 0; n.vy = 0
      } else {
        n.vx += (cx - n.x) * GRAVITY * alpha
        n.vy += (cy - n.y) * GRAVITY * alpha
        n.vx *= DAMPING; n.vy *= DAMPING
        n.x += n.vx; n.y += n.vy
      }
    }
    s.tick++
  }

  const draw = useCallback((s: State, canvas: HTMLCanvasElement, dpr: number) => {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    ctx.clearRect(0, 0, W, H)

    // Background grid (subtle)
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    const gridSize = 40 * s.zoom
    const offX = s.panX % gridSize, offY = s.panY % gridSize
    for (let x = offX; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
    for (let y = offY; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }
    ctx.restore()

    ctx.save()
    ctx.translate(s.panX, s.panY)
    ctx.scale(s.zoom, s.zoom)

    const lw = 1.2 / s.zoom
    const selectedId = s.selected?.id
    const hoveredId = s.hovered?.id

    // Dim non-connected nodes when something is selected
    const connectedIds = new Set<string>()
    if (selectedId) {
      connectedIds.add(selectedId)
      for (const e of s.edges) {
        if (e.source.id === selectedId) connectedIds.add(e.target.id)
        if (e.target.id === selectedId) connectedIds.add(e.source.id)
      }
    }

    // Edges
    for (const e of s.edges) {
      const color = EDGE_COLORS[e.type] || '#64748b'
      const isConnected = !selectedId || connectedIds.has(e.source.id) && connectedIds.has(e.target.id)
      ctx.globalAlpha = isConnected ? 0.5 : 0.08
      ctx.beginPath()
      ctx.moveTo(e.source.x, e.source.y)

      // Slight curve for aesthetics
      const mx = (e.source.x + e.target.x) / 2 + (e.target.y - e.source.y) * 0.08
      const my = (e.source.y + e.target.y) / 2 - (e.target.x - e.source.x) * 0.08
      ctx.quadraticCurveTo(mx, my, e.target.x, e.target.y)

      ctx.strokeStyle = color
      ctx.lineWidth = lw
      ctx.stroke()

      // Arrow
      if (isConnected) {
        const dx = e.target.x - mx, dy = e.target.y - my
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const tip = { x: e.target.x - dx / d * (e.target.radius + 2), y: e.target.y - dy / d * (e.target.radius + 2) }
        const angle = Math.atan2(dy, dx)
        const al = 6 / s.zoom
        ctx.beginPath()
        ctx.moveTo(tip.x, tip.y)
        ctx.lineTo(tip.x - al * Math.cos(angle - 0.5), tip.y - al * Math.sin(angle - 0.5))
        ctx.lineTo(tip.x - al * Math.cos(angle + 0.5), tip.y - al * Math.sin(angle + 0.5))
        ctx.closePath()
        ctx.fillStyle = color
        ctx.fill()
      }
    }

    ctx.globalAlpha = 1

    // Nodes
    const fs = Math.max(9, Math.min(13, 11 / s.zoom))
    ctx.font = `${fs}px -apple-system, BlinkMacSystemFont, sans-serif`

    for (const n of s.nodes) {
      const color = NODE_COLORS[n.type] || '#94a3b8'
      const isSelected = n.id === selectedId
      const isHovered = n.id === hoveredId
      const isDimmed = selectedId && !connectedIds.has(n.id)
      ctx.globalAlpha = isDimmed ? 0.2 : 1

      // Glow for selected
      if (isSelected) {
        ctx.shadowColor = color
        ctx.shadowBlur = 20 / s.zoom
      }

      ctx.beginPath()
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
      ctx.fillStyle = isSelected ? color : color + 'cc'
      ctx.fill()
      ctx.shadowBlur = 0

      // Border ring
      ctx.strokeStyle = isSelected ? '#ffffff' : isHovered ? color : color + '80'
      ctx.lineWidth = (isSelected || isHovered ? 2.5 : 1.2) / s.zoom
      ctx.stroke()

      // Inner highlight
      ctx.beginPath()
      ctx.arc(n.x - n.radius * 0.25, n.y - n.radius * 0.3, n.radius * 0.4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fill()

      // Label — show for high-degree, hovered, or selected
      if (isHovered || isSelected || n.degree >= 4) {
        ctx.globalAlpha = isDimmed ? 0.2 : isHovered || isSelected ? 1 : 0.75
        const label = n.label.length > 22 ? n.label.slice(0, 20) + '…' : n.label
        const tw = ctx.measureText(label).width
        const lx = n.x, ly = n.y + n.radius + fs * 1.4

        ctx.fillStyle = 'rgba(0,0,0,0.65)'
        ctx.beginPath()
        ctx.roundRect(lx - tw / 2 - 4, ly - fs + 1, tw + 8, fs + 6, 4 / s.zoom)
        ctx.fill()

        ctx.fillStyle = '#f8fafc'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, lx, ly + 2)
      }
    }

    ctx.globalAlpha = 1
    ctx.restore()
  }, [])

  const startLoop = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const W = container.clientWidth * dpr
    const H = container.clientHeight * dpr
    canvas.width = W; canvas.height = H

    const cx = W / 2 + stateRef.current.panX
    const cy = H / 2 + stateRef.current.panY

    const s = stateRef.current

    const loop = () => {
      if (s.tick < MAX_TICKS + 20) simulate(s, W / 2, H / 2)
      draw(s, canvas, dpr)
      s.animId = requestAnimationFrame(loop)
    }

    cancelAnimationFrame(s.animId)
    s.animId = requestAnimationFrame(loop)
  }, [draw])

  // Initialize simulation when nodes/edges change
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const dpr = window.devicePixelRatio || 1
    const W = container.clientWidth * dpr
    const H = container.clientHeight * dpr
    const cx = W / 2, cy = H / 2

    // Build degree map
    const degree: Record<string, number> = {}
    for (const e of edges) {
      degree[e.source] = (degree[e.source] || 0) + 1
      degree[e.target] = (degree[e.target] || 0) + 1
    }

    const nodeMap = new Map<string, SimNode>()
    const simNodes: SimNode[] = nodes.map((n) => {
      const d = degree[n.id] || 0
      const r = Math.min(22, Math.max(7, 7 + d * 1.8))
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * Math.min(cx, cy) * 0.6 + 40
      const sn: SimNode = {
        ...n,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: 0, vy: 0,
        radius: r,
        degree: d,
      }
      nodeMap.set(n.id, sn)
      return sn
    })

    const simEdges: SimEdge[] = edges
      .map((e) => ({
        source: nodeMap.get(e.source)!,
        target: nodeMap.get(e.target)!,
        type: e.type,
      }))
      .filter((e) => e.source && e.target)

    const s = stateRef.current
    s.nodes = simNodes
    s.edges = simEdges
    s.tick = 0
    s.selected = null
    s.hovered = null

    startLoop()
    return () => cancelAnimationFrame(stateRef.current.animId)
  }, [nodes, edges, startLoop])

  // Mouse events
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current
    const dpr = window.devicePixelRatio || 1
    s.mouseX = e.clientX; s.mouseY = e.clientY

    const { x: wx, y: wy } = toWorld(e.clientX, e.clientY, s, dpr)

    if (s.isDraggingNode && s.dragging) {
      s.dragging.fx = wx; s.dragging.fy = wy
      s.tick = Math.min(s.tick, MAX_TICKS - 10)
      return
    }

    if (s.isPanning) {
      s.panX = s.panOriginX + (e.clientX - s.panStartX) * dpr
      s.panY = s.panOriginY + (e.clientY - s.panStartY) * dpr
      return
    }

    const hit = nodeAt(wx, wy)
    s.hovered = hit
    if (canvasRef.current) {
      canvasRef.current.style.cursor = hit ? 'pointer' : 'grab'
    }
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current
    const dpr = window.devicePixelRatio || 1
    const { x: wx, y: wy } = toWorld(e.clientX, e.clientY, s, dpr)
    const hit = nodeAt(wx, wy)

    if (hit) {
      s.dragging = hit
      s.isDraggingNode = true
    } else {
      s.isPanning = true
      s.panStartX = e.clientX
      s.panStartY = e.clientY
      s.panOriginX = s.panX
      s.panOriginY = s.panY
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
    }
  }, [])

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current
    const dpr = window.devicePixelRatio || 1

    if (s.isDraggingNode && s.dragging) {
      // Short drag = click; long drag = pin
      const dx = e.clientX - s.mouseX, dy = e.clientY - s.mouseY
      const moved = Math.sqrt(dx * dx + dy * dy) < 5
      if (moved) {
        const { x: wx, y: wy } = toWorld(e.clientX, e.clientY, s, dpr)
        const hit = nodeAt(wx, wy)
        if (hit) {
          s.selected = s.selected?.id === hit.id ? null : hit
          if (onNodeClick && s.selected) {
            onNodeClick({ id: hit.id, label: hit.label, type: hit.type, properties: hit.properties })
          }
        }
        // Unpin after click
        delete s.dragging.fx; delete (s.dragging as SimNode).fy
      }
      s.isDraggingNode = false
      s.dragging = null
    }

    s.isPanning = false
    if (canvasRef.current) canvasRef.current.style.cursor = s.hovered ? 'pointer' : 'grab'
  }, [onNodeClick])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const s = stateRef.current
    const dpr = window.devicePixelRatio || 1
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) * dpr
    const py = (e.clientY - rect.top) * dpr

    const delta = e.deltaY > 0 ? 0.9 : 1.11
    const newZoom = Math.min(4, Math.max(0.25, s.zoom * delta))

    s.panX = px - (px - s.panX) * (newZoom / s.zoom)
    s.panY = py - (py - s.panY) * (newZoom / s.zoom)
    s.zoom = newZoom
  }, [])

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = container.clientWidth * dpr
      canvas.height = container.clientHeight * dpr
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: 'grab' }}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { stateRef.current.hovered = null; stateRef.current.isPanning = false }}
        onWheel={onWheel}
      />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl p-3">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 text-xs text-white/70">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            {type}
          </div>
        ))}
      </div>
      {/* Zoom hint */}
      <div className="absolute bottom-4 right-4 text-xs text-white/30 select-none">
        Scroll to zoom · Drag to pan
      </div>
    </div>
  )
}
