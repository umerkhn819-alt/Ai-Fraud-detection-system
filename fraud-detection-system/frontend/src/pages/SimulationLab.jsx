import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FlaskConical, RefreshCw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../services/api'

export default function SimulationLab() {
  const [threshold, setThreshold] = useState(0.5)
  const [applied, setApplied] = useState(0.5)

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['simulation-threshold', applied],
    queryFn: async () => (await api.get(`/simulation/threshold-impact?threshold=${applied}`)).data,
    enabled: true,
  })

  const apply = () => { setApplied(threshold); refetch() }

  const getColor = (t) => t < 0.3 ? '#10b981' : t < 0.6 ? '#f59e0b' : t < 0.8 ? '#f97316' : '#ef4444'

  const chartData = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(t => ({
    threshold: t.toFixed(1),
    active: Math.abs(t - applied) < 0.05,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Simulation Lab</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          Explore how different classification thresholds affect fraud detection
        </p>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-violet-500" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Threshold Tuner</h2>
          </div>
          <span className="rounded-xl border px-3 py-1 text-xs font-bold" style={{
            borderColor: getColor(threshold) + '40',
            color: getColor(threshold),
            background: getColor(threshold) + '10',
          }}>
            {threshold.toFixed(2)}
          </span>
        </div>

        <input
          id="threshold-slider"
          type="range" min="0" max="1" step="0.01"
          value={threshold}
          onChange={e => setThreshold(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: getColor(threshold) }}
        />

        <div className="mt-2 flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>0.0 — All flagged</span>
          <span>0.5 — Balanced</span>
          <span>1.0 — None flagged</span>
        </div>

        <button type="button" id="simulation-apply-btn" onClick={apply}
          className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Calculating…' : 'Apply Threshold'}
        </button>
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['Total Predictions', data.total_predictions],
            ['Flagged as Fraud', data.flagged_predictions],
            ['Flag Rate', `${data.flag_rate_percent}%`],
          ].map(([label, val]) => (
            <div key={label} className="card p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
              <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{val}</p>
              <div className="mt-3 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-brand-500 opacity-40" />
            </div>
          ))}
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Threshold Risk Spectrum</h2>
        <div className="relative h-6 w-full rounded-full overflow-hidden">
          <div className="h-full w-full" style={{
            background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 40%, #f97316 70%, #ef4444 100%)'
          }} />
          <div className="absolute inset-y-0 w-1.5 bg-white shadow-lg rounded-full transition-all duration-300"
            style={{ left: `calc(${threshold * 100}% - 3px)` }} />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-[var(--text-muted)]">
          <span className="text-success-500 font-medium">Low Risk</span>
          <span className="text-warning-500 font-medium">Medium</span>
          <span className="text-orange-500 font-medium">High</span>
          <span className="text-fraud-500 font-medium">Critical</span>
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          <strong className="text-[var(--text-primary)]">Tip:</strong> Lower threshold = more fraud caught (higher recall) but more false positives.
          Higher threshold = fewer false positives but risk of missing real fraud.
        </p>
      </div>
    </div>
  )
}
