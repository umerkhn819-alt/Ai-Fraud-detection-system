import { useEffect, useRef } from 'react'
import { cn } from '../../utils/helpers'

const SEGMENTS = [
  { label: 'Low', max: 0.3, from: '#10b981', to: '#34d399' },
  { label: 'Med', max: 0.6, from: '#f59e0b', to: '#fbbf24' },
  { label: 'High', max: 0.8, from: '#f97316', to: '#fb923c' },
  { label: 'Critical', max: 1.0, from: '#ef4444', to: '#dc2626' },
]

function getColor(score) {
  if (score < 0.3) return '#10b981'
  if (score < 0.6) return '#f59e0b'
  if (score < 0.8) return '#f97316'
  return '#ef4444'
}

export default function RiskScoreBar({ score = 0, threshold = 0.5, label }) {
  const pct = Math.min(Math.max(score * 100, 0), 100)
  const thPct = Math.min(Math.max(threshold * 100, 0), 100)
  const color = getColor(score)

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-muted)]">{label}</span>
          <span className="font-bold" style={{ color }}>{(score * 100).toFixed(1)}%</span>
        </div>
      )}

      {/* Bar */}
      <div className="relative h-4 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #10b981, ${color})`,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
        {/* Threshold marker */}
        <div
          className="absolute inset-y-0 w-0.5 bg-white/80 z-10"
          style={{ left: `${thPct}%` }}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-[var(--text-muted)] whitespace-nowrap">
            threshold
          </div>
        </div>
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  )
}
