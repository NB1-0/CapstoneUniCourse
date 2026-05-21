'use client'
import { useCallback, useEffect, useRef } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type OnInit,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { NODE_TYPES, DOMAIN_PALETTE } from './MapNodes'

// ── Edge defaults ─────────────────────────────────────────────────────────────

export const EDGE_STYLES = {
  progression: {
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#3b82f6' },
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    labelStyle: { fill: '#94a3b8', fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: 'transparent' },
    labelBgPadding: [4, 4] as [number, number],
  },
  required: {
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
    style: { strokeWidth: 1.5 },
    labelStyle: { fill: '#94a3b8', fontSize: 10 },
    labelBgStyle: { fill: 'transparent' },
  },
  course: {
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#3b82f6' },
    style: { stroke: '#3b82f660', strokeWidth: 1.5, strokeDasharray: '6 3' },
  },
  related: {
    style: { stroke: '#8b5cf660', strokeWidth: 1, strokeDasharray: '4 4' },
  },
  prereq: {
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#f59e0b' },
    style: { stroke: '#f59e0b', strokeWidth: 1.5 },
  },
} as const

// ── React Flow canvas ─────────────────────────────────────────────────────────

interface LearningMapProps {
  initialNodes: Node[]
  initialEdges: Edge[]
  onNodeClick?: (node: Node) => void
  fitOnLoad?: boolean
  showMinimap?: boolean
  className?: string
}

export default function LearningMap({
  initialNodes,
  initialEdges,
  onNodeClick,
  fitOnLoad = true,
  showMinimap = true,
  className = '',
}: LearningMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const { fitView } = useReactFlow()
  const didFit = useRef(false)

  // Sync external data changes
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
    didFit.current = false
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const handleInit: OnInit = useCallback(() => {
    if (fitOnLoad && !didFit.current) {
      setTimeout(() => { fitView({ padding: 0.15, duration: 600 }); didFit.current = true }, 80)
    }
  }, [fitView, fitOnLoad])

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => { onNodeClick?.(node) },
    [onNodeClick],
  )

  const miniMapNodeColor = useCallback((node: Node): string => {
    if (node.type === 'careerNode') return '#f59e0b'
    if (node.type === 'courseNode') return '#3b82f6'
    if (node.type === 'milestoneNode') return '#10b981'
    const domain = (node.data as { domain?: string }).domain
    return DOMAIN_PALETTE[domain ?? '']?.border ?? '#64748b'
  }, [])

  return (
    <ReactFlow
      className={className}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onInit={handleInit}
      nodeTypes={NODE_TYPES}
      fitView={false}
      minZoom={0.15}
      maxZoom={2.5}
      defaultEdgeOptions={{
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#475569', strokeWidth: 1.5 },
      }}
      proOptions={{ hideAttribution: true }}
    >
      {/* Dark dot grid */}
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1.5}
        color="#1e293b"
        style={{ background: '#060c18' }}
      />

      {/* Zoom / fit controls */}
      <Controls
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
        showInteractive={false}
      />

      {/* Minimap */}
      {showMinimap && (
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor="rgba(6, 12, 24, 0.75)"
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 12,
          }}
          pannable
          zoomable
        />
      )}

      {/* Legend panel */}
      <Panel position="top-right">
        <div className="flex flex-col gap-1.5 bg-[#0f172a]/90 backdrop-blur border border-[#1e293b] rounded-xl p-3 text-[11px]">
          {[
            { color: '#10b981', label: 'Skill node' },
            { color: '#3b82f6', label: 'Course' },
            { color: '#f59e0b', label: 'Career goal' },
            { color: '#8b5cf6', label: 'Advanced skill' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 text-slate-400">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
              {label}
            </div>
          ))}
          <div className="mt-1 pt-1.5 border-t border-[#1e293b] space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-5 h-px bg-blue-400" />animated = progression
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-5 h-px bg-amber-400" style={{ borderTop: '1px dashed #f59e0b' }} />dashed = prereq
            </div>
          </div>
        </div>
      </Panel>
    </ReactFlow>
  )
}
