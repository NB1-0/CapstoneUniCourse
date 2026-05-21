import dagre from '@dagrejs/dagre'
import type { Node, Edge } from 'reactflow'

export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL'

interface LayoutOptions {
  direction?: LayoutDirection
  nodeWidth?: number
  nodeHeight?: number
  nodeSep?: number
  rankSep?: number
}

/**
 * Compute Dagre auto-layout positions for React Flow nodes.
 * Creates a fresh dagre graph each call to avoid stale state.
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
): { nodes: Node[]; edges: Edge[] } {
  const {
    direction = 'TB',
    nodeWidth = 220,
    nodeHeight = 100,
    nodeSep = 60,
    rankSep = 90,
  } = options

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: nodeSep, ranksep: rankSep, marginx: 40, marginy: 40 })

  nodes.forEach((n) => {
    g.setNode(n.id, { width: n.width ?? nodeWidth, height: n.height ?? nodeHeight })
  })
  edges.forEach((e) => g.setEdge(e.source, e.target))

  dagre.layout(g)

  const layoutedNodes = nodes.map((n) => {
    const pos = g.node(n.id)
    const w = n.width ?? nodeWidth
    const h = n.height ?? nodeHeight
    return {
      ...n,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
    }
  })

  return { nodes: layoutedNodes, edges }
}

/** Build nodes + edges from a flat skill chain: [Python, Data Analysis, Machine Learning] */
export function chainToFlow(
  skills: Array<{ id: string; label: string; data: Record<string, unknown> }>,
  edgeProps?: Partial<Edge>,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = skills.map((s, i) => ({
    id: s.id,
    type: 'skillNode',
    data: { label: s.label, ...s.data },
    position: { x: 0, y: i * 160 },
    width: 240,
    height: 110,
  }))

  const edges: Edge[] = skills.slice(1).map((s, i) => ({
    id: `e-${skills[i].id}-${s.id}`,
    source: skills[i].id,
    target: s.id,
    animated: true,
    ...edgeProps,
  }))

  return getLayoutedElements(nodes, edges, { direction: 'TB', rankSep: 100 })
}
