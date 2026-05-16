import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import api from '../services/api'
import FraudLineChart from '../components/charts/FraudLineChart'
import ConfusionMatrix from '../components/charts/ConfusionMatrix'
import Table from '../components/ui/Table'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'

const SEV_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#10b981',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-float text-xs">
      <p className="mb-1 font-semibold text-[var(--text-primary)]">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-[var(--text-secondary)]">{p.value} predictions</span>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { data: timeData, isLoading: l1 } = useQuery({
    queryKey: ['fraud-over-time'],
    queryFn: () => api.get('/dashboard/fraud-over-time').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
  })
  const { data: severity, isLoading: l2 } = useQuery({
    queryKey: ['severity-distribution'],
    queryFn: () => api.get('/dashboard/severity-distribution').then(r => r.data),
  })
  const { data: merchants } = useQuery({
    queryKey: ['top-merchants'],
    queryFn: () => api.get('/dashboard/top-merchants', { params: { limit: 8 } }).then(r => r.data),
  })
  const { data: liveMetrics } = useQuery({
    queryKey: ['model-monitoring-metrics'],
    queryFn: () => api.get('/model-monitoring/metrics').then(r => r.data),
  })

  const hasGT = liveMetrics?.has_ground_truth ?? false
  const c = hasGT
    ? (liveMetrics?.confusion || {})
    : (liveMetrics?.estimated_confusion || {})
  const labeled = liveMetrics?.labeled_scored_pairs ?? 0

  const getMetric = (key) => {
    const real = liveMetrics?.[key]
    if (real != null) return { val: (real * 100).toFixed(1) + '%', est: false }
    const est = liveMetrics?.[`estimated_${key}`]
    if (est != null) return { val: (est * 100).toFixed(1) + '%', est: true }
    return { val: '—', est: false }
  }

  const metricCards = [
    { label: 'Precision', ...getMetric('precision') },
    { label: 'Recall', ...getMetric('recall') },
    { label: 'F1 Score', ...getMetric('f1') },
    { label: 'Threshold', val: liveMetrics?.threshold_used != null ? Number(liveMetrics.threshold_used).toFixed(4) : '—', est: false },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Deep Analytics</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">Severity mix, merchants, model performance, and scoring trends</p>
      </div>

      {/* Model metric cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map(m => (
          <div key={m.label} className="card p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{m.label}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{m.val}</p>
            {m.est && (
              <span className="mt-1 inline-block rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500">
                estimated
              </span>
            )}
            <div className="mt-2 h-0.5 rounded-full bg-gradient-to-r from-brand-500 to-violet-500 opacity-40" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend chart */}
        <div className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Fraud Trend</h2>
          {l1 ? <div className="shimmer h-48 rounded-xl" /> : (
            <FraudLineChart data={Array.isArray(timeData) ? timeData : []} />
          )}
        </div>

        {/* Severity bar chart */}
        <div className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Severity Distribution</h2>
          {l2 ? <div className="shimmer h-48 rounded-xl" /> : !severity?.length ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-tertiary)]">
                <svg className="h-5 w-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">No severity data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={severity || []} margin={{ top: 0, right: 0, left: -10, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="severity"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {(severity || []).map((entry, i) => (
                    <Cell key={i} fill={SEV_COLORS[entry.severity] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Confusion matrix */}
        <div className="card p-5">
          <h2 className="mb-1 text-base font-semibold text-[var(--text-primary)]">Confusion Matrix</h2>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            {hasGT
              ? `${labeled} labeled predictions · threshold ${Number(liveMetrics?.threshold_used ?? 0.5).toFixed(4)}`
              : <span>Showing <span className="font-semibold text-amber-500">model self-assessment</span> — upload CSV with <code className="bg-[var(--bg-tertiary)] px-1 rounded">Class</code> column for ground truth</span>
            }
          </p>
          <ConfusionMatrix tp={c.tp ?? 0} tn={c.tn ?? 0} fp={c.fp ?? 0} fn={c.fn ?? 0} />
        </div>

        {/* Top merchants */}
        <div className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Top Fraud Merchants</h2>
          <Table
            columns={[
              { key: 'merchant', label: 'Merchant' },
              { key: 'count', label: 'Flagged Txns', render: (_, row) => (
                <span className="font-semibold text-fraud-500">{row.count}</span>
              )},
            ]}
            data={merchants || []}
            emptyMessage="Upload transactions with merchant_name to populate"
          />
        </div>
      </div>
    </div>
  )
}
