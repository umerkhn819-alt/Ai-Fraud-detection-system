import { useMemo } from 'react'

export default function EntityNetworkMini({ nodes = [], edges = [], width = 560, height = 320 }) {
  const graph = useMemo(() => {
    const visibleNodes = nodes.slice(0, 24)
    const idToIdx = new Map(visibleNodes.map((n, i) => [n.id, i]))
    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(width, height) * 0.36

    const positioned = visibleNodes.map((n, i) => {
      const angle = (i / Math.max(visibleNodes.length, 1)) * Math.PI * 2
      return {
        ...n,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      }
    })

    const visibleEdges = edges
      .filter((e) => idToIdx.has(e.source) && idToIdx.has(e.target))
      .slice(0, 80)
      .map((e) => ({
        ...e,
        a: positioned[idToIdx.get(e.source)],
        b: positioned[idToIdx.get(e.target)],
      }))

    return { positioned, visibleEdges }
  }, [nodes, edges, width, height])

  if (!graph.positioned.length) {
    return <p className="text-sm text-slate-500">No nodes available yet.</p>
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-80 w-full rounded border border-slate-200 bg-slate-50">
      {graph.visibleEdges.map((e, idx) => (
        <line
          key={`e-${idx}`}
          x1={e.a.x}
          y1={e.a.y}
          x2={e.b.x}
          y2={e.b.y}
          stroke="#94a3b8"
          strokeOpacity="0.45"
          strokeWidth={Math.min(3, 1 + (e.weight || 1) * 0.2)}
        />
      ))}
      {graph.positioned.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r="7" fill="#2563eb" />
          <title>{n.label || n.id}</title>
        </g>
      ))}
    </svg>
  )
}
