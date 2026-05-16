import { useQuery } from '@tanstack/react-query'
import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, ShieldAlert, Cpu, Network, Globe } from 'lucide-react'
import api from '../services/api'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'

export default function Entities() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['entity-graph'],
    queryFn: async () => (await api.get('/entities/graph')).data,
    refetchInterval: 15000, // Live refresh
  })

  // Hash function for stable random positions
  const seededRandom = (seed) => {
    let h = 0xdeadbeef
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 2654435761)
    return ((h ^ h >>> 16) >>> 0) / 4294967296
  }

  if (isLoading) return <LoadingSkeleton rows={4} />
  if (isError) return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-fraud-500/20 bg-fraud-500/5 text-fraud-400">
      <ShieldAlert className="mr-2 h-5 w-5" /> Failed to establish intelligence uplink.
    </div>
  )

  const rawEdges = data?.edges || []
  const rawNodes = data?.nodes || []

  // Extract a highly connected subset for performance and visual clarity (max 50 nodes)
  const topEdges = [...rawEdges].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 50)
  const activeNodeIds = new Set(topEdges.flatMap(e => [e.source, e.target]))
  const displayNodes = rawNodes.filter(n => activeNodeIds.has(n.id)).slice(0, 40)
  const displayEdges = topEdges.filter(e => displayNodes.some(n => n.id === e.source) && displayNodes.some(n => n.id === e.target))

  // Assign stable coordinates (0 to 100%)
  const mappedNodes = displayNodes.map((node) => ({
    ...node,
    x: seededRandom(node.id + 'x') * 80 + 10,
    y: seededRandom(node.id + 'y') * 80 + 10,
    isThreat: seededRandom(node.id) > 0.8 || node.weight > 10
  }))

  const getIconForKind = (kind) => {
    switch (kind) {
      case 'ip': return <Globe className="h-4 w-4" />
      case 'device': return <Cpu className="h-4 w-4" />
      default: return <Network className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-[var(--text-primary)]">
            <Activity className="mr-3 h-6 w-6 text-brand-500" />
            Live Intelligence Map
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Real-time geospatial network analysis of active transactions.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500"></span>
          </span>
          UPLINK ACTIVE
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-4">

        {/* The Cyber Map Canvas */}
        <div className="card relative col-span-1 min-h-[500px] overflow-hidden rounded-xl border border-[var(--border)] bg-gray-900 shadow-2xl lg:col-span-3">

          {/* Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

          {/* Radar Sweep Effect */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-500/20"
            style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(6, 182, 212, 0.1) 100%)' }}
          />

          <svg className="absolute inset-0 h-full w-full">
            {/* Draw Edges */}
            {displayEdges.map((edge, i) => {
              const source = mappedNodes.find(n => n.id === edge.source)
              const target = mappedNodes.find(n => n.id === edge.target)
              if (!source || !target) return null

              const isThreatEdge = source.isThreat || target.isThreat

              return (
                <g key={i}>
                  <line
                    x1={`${source.x}%`} y1={`${source.y}%`}
                    x2={`${target.x}%`} y2={`${target.y}%`}
                    stroke={isThreatEdge ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.15)'}
                    strokeWidth="1.5"
                  />
                  {/* Data Packet Animation */}
                  <motion.circle
                    r="2"
                    fill={isThreatEdge ? '#ef4444' : '#06b6d4'}
                    initial={{ cx: `${source.x}%`, cy: `${source.y}%`, opacity: 0 }}
                    animate={{
                      cx: [`${source.x}%`, `${target.x}%`],
                      cy: [`${source.y}%`, `${target.y}%`],
                      opacity: [0, 1, 1, 0]
                    }}
                    transition={{
                      duration: 2 + seededRandom(edge.source) * 2,
                      repeat: Infinity,
                      delay: seededRandom(edge.target) * 3,
                      ease: "easeInOut"
                    }}
                  />
                </g>
              )
            })}
          </svg>

          {/* Draw Nodes */}
          {mappedNodes.map((node) => (
            <motion.div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              whileHover={{ scale: 1.5, zIndex: 10 }}
            >
              <div className="group relative">
                {node.isThreat && (
                  <span className="absolute -inset-2 animate-ping rounded-full bg-fraud-500/40"></span>
                )}
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md transition-colors ${node.isThreat
                    ? 'border-fraud-400 bg-fraud-500/20 text-fraud-400 shadow-fraud-500/50'
                    : 'border-brand-400/50 bg-brand-500/10 text-brand-400'
                  }`}>
                  {getIconForKind(node.kind)}
                </div>

                {/* Tooltip */}
                <div className="pointer-events-none absolute left-10 top-0 z-50 w-48 rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-xs opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                  <p className="font-bold text-[var(--text-primary)] truncate">{node.id}</p>
                  <p className="text-[var(--text-muted)] uppercase tracking-wider mt-1">Type: {node.kind}</p>
                  {node.isThreat && <p className="mt-1 font-bold text-fraud-500">THREAT DETECTED</p>}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Overlay Stats */}
          <div className="absolute bottom-4 left-4 rounded-lg border border-[var(--border)] bg-gray-900/80 p-3 backdrop-blur-md">
            <div className="flex gap-6 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <div>Active Nodes: <span className="text-brand-400">{rawNodes.length}</span></div>
              <div>Traces: <span className="text-violet-400">{rawEdges.length}</span></div>
              <div>Threats: <span className="text-fraud-500">{mappedNodes.filter(n => n.isThreat).length}</span></div>
            </div>
          </div>
        </div>

        {/* Live Event Feed */}
        <div className="card col-span-1 flex flex-col p-0 overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--bg-card-hover)] p-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center">
              <Activity className="w-4 h-4 mr-2 text-brand-500" /> System Feed
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[500px]">
            {displayEdges.slice(0, 15).map((edge, i) => {
              const source = mappedNodes.find(n => n.id === edge.source)
              const isThreat = source?.isThreat
              return (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                  className={`border-l-2 p-3 text-xs rounded-r-lg bg-[var(--bg-body)] ${isThreat ? 'border-fraud-500' : 'border-brand-500'}`}
                >
                  <p className={`font-bold uppercase mb-1 ${isThreat ? 'text-fraud-500' : 'text-brand-500'}`}>
                    {isThreat ? 'Suspicious Trace' : 'Secure Handshake'}
                  </p>
                  <p className="text-[var(--text-secondary)] font-mono truncate">{edge.source}</p>
                  <p className="text-[var(--text-muted)] mt-1">Weight: {edge.weight}</p>
                </motion.div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
