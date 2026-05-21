'use client'
import { useMemo, useCallback } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap,
  type Node, type Edge,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import type { FutureCareerPath } from '@/types'

interface CareerTimelineGraphProps {
  path: FutureCareerPath
}

const PHASE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Foundation':   { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
  'Core Skills':  { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  'Advanced':     { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'Career Ready': { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
}

function buildGraphFromPath(path: FutureCareerPath): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Start node
  nodes.push({
    id: 'start',
    type: 'input',
    data: { label: 'You Today' },
    position: { x: 0, y: 180 },
    style: {
      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      color: '#fff',
      borderRadius: '14px',
      border: 'none',
      padding: '10px 18px',
      fontWeight: 700,
      fontSize: 13,
      minWidth: 120,
      boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
    },
  })

  const X_GAP = 200
  let x = X_GAP
  let prevId = 'start'

  path.roadmap_steps.forEach((step, i) => {
    const nodeId = `step-${step.step}`
    const colors = PHASE_COLORS[step.phase] ?? { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
    const yOffset = i % 2 === 0 ? 80 : 280

    nodes.push({
      id: nodeId,
      data: {
        label: (
          `${step.skill}\n${step.course_name.slice(0, 28)}${step.course_name.length > 28 ? '…' : ''}`
        ),
      },
      position: { x, y: yOffset },
      style: {
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'pre-line',
        padding: '8px 12px',
        minWidth: 130,
      },
    })

    edges.push({
      id: `e-${prevId}-${nodeId}`,
      source: prevId,
      target: nodeId,
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
    })

    prevId = nodeId
    x += X_GAP
  })

  // Outcome node
  nodes.push({
    id: 'outcome',
    type: 'output',
    data: {
      label: `${path.career_goal}\n${path.success_probability.toFixed(0)}% · ${path.estimated_months}mo`,
    },
    position: { x, y: 180 },
    style: {
      background: 'linear-gradient(135deg, #059669, #047857)',
      color: '#fff',
      borderRadius: '14px',
      border: 'none',
      padding: '10px 18px',
      fontWeight: 700,
      fontSize: 13,
      minWidth: 140,
      whiteSpace: 'pre-line',
      textAlign: 'center',
      boxShadow: '0 4px 14px rgba(5,150,105,0.35)',
    },
  })
  edges.push({
    id: `e-${prevId}-outcome`,
    source: prevId,
    target: 'outcome',
    animated: true,
    style: { stroke: '#059669', strokeWidth: 2 },
  })

  return { nodes, edges }
}

export function CareerTimelineGraph({ path }: CareerTimelineGraphProps) {
  const { nodes, edges } = useMemo(() => buildGraphFromPath(path), [path])

  return (
    <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Interactive Career Timeline</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {path.path_name} — drag to pan, scroll to zoom
        </p>
      </div>
      <div className="h-96">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border))" />
          <Controls
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
            }}
          />
          <MiniMap
            nodeColor={(node) => {
              if (node.id === 'start') return '#4f46e5'
              if (node.id === 'outcome') return '#059669'
              return '#6366f1'
            }}
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
            }}
          />
        </ReactFlow>
      </div>

      {/* Phase legend */}
      <div className="px-4 pb-3 pt-2 flex flex-wrap gap-3 border-t border-border">
        {Object.entries(PHASE_COLORS).map(([phase, c]) => (
          <div key={phase} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.bg, border: `1px solid ${c.border}` }} />
            <span className="text-[10px] text-muted-foreground">{phase}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
