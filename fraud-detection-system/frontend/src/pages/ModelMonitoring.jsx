import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import api from '../services/api'
import { Activity, GitBranch, Target, TrendingUp } from 'lucide-react'

const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6']

function StatCard({ title, value, sub, icon: Icon, gradient }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradient}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value ?? '—'}</p>
      {sub && <p className="mt-1 text-xs text-[var(--text-muted)]">{sub}</p>}
    </div>
  )
}

export default function ModelMonitoring() {
  const snapshot = useQuery({
    queryKey: ['mm-snapshot'],
    queryFn: async () => (await api.get('/model-monitoring/snapshot')).data,
    refetchInterval: 15000,
  })
  const dist = useQuery({
    queryKey: ['mm-dist'],
    queryFn: async () => (await api.get('/model-monitoring/distribution')).data,
    refetchInterval: 15000,
  })
  const feedback = useQuery({
    queryKey: ['mm-feedback'],
    queryFn: async () => (await api.get('/model-monitoring/feedback-summary')).data,
    retry: 1,
  })
  const fraudTrend = useQuery({
    queryKey: ['mm-fraud-trend'],
    queryFn: async () => {
      const r = await api.get('/dashboard/fraud-over-time')
      return Array.isArray(r.data) ? r.data : (r.data?.data ?? [])
    },
    refetchInterval: 15000,
  })
  const metrics = useQuery({
    queryKey: ['model-monitoring-metrics'],
    queryFn: async () => (await api.get('/model-monitoring/metrics')).data,
    retry: 1,
  })

  if (snapshot.isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-[var(--bg-secondary)]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="card h-28 bg-[var(--bg-secondary)]" />)}
        </div>
      </div>
    )
  }

  const meta = metrics.data || {}
  const snap = snapshot.data || {}

  // Get threshold and F1 — prefer live metrics, fall back to metadata from training
  const threshold = meta.threshold_used != null
    ? Number(meta.threshold_used).toFixed(4)
    : meta.model_threshold_from_artifact != null
      ? Number(meta.model_threshold_from_artifact).toFixed(4)
      : null

  const f1 = meta.f1 != null ? (meta.f1 * 100).toFixed(1) + '%' : null

  const CARDS = [
    {
      title: 'Fraud Rate 24h',
      value: `${(snap.fraud_rate_last_24h ?? 0).toFixed(2)}%`,
      sub: `${snap.fraud_last_24h ?? 0} fraudulent predictions`,
      icon: TrendingUp,
      gradient: 'from-fraud-500 to-fraud-700',
    },
    {
      title: 'Predictions 24h',
      value: (snap.predictions_last_24h ?? 0).toLocaleString(),
      sub: `${snap.transactions_last_24h ?? 0} transactions processed`,
      icon: Activity,
      gradient: 'from-brand-500 to-brand-700',
    },
    {
      title: 'Model Threshold',
      value: threshold ?? '—',
      sub: threshold ? 'Calibrated decision boundary' : 'Load metadata to see',
      icon: Target,
      gradient: 'from-violet-500 to-violet-700',
    },
    {
      title: 'F1 Score',
      value: f1 ?? (meta.labeled_scored_pairs === 0 ? 'Upload CSV' : '—'),
      sub: meta.labeled_scored_pairs
        ? `From ${meta.labeled_scored_pairs.toLocaleString()} labeled pairs`
        : 'Needs labeled data from CSV upload',
      icon: GitBranch,
      gradient: 'from-success-500 to-success-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Model Monitoring</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          {meta.winner_model
            ? `Active: ${meta.winner_model} · Calibration: ${meta.calibration ?? 'N/A'} · Threshold: ${threshold ?? 'N/A'}`
            : 'Model performance and drift monitoring'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map(c => <StatCard key={c.title} {...c} />)}
      </div>

      {/* Confusion Matrix (if data exists) */}
      {meta.confusion && meta.labeled_scored_pairs > 0 && (
        <div className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Confusion Matrix</h2>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            {[
              { label: 'True Positive', value: meta.confusion.tp, color: '#10b981' },
              { label: 'False Positive', value: meta.confusion.fp, color: '#ef4444' },
              { label: 'False Negative', value: meta.confusion.fn, color: '#f59e0b' },
              { label: 'True Negative', value: meta.confusion.tn, color: '#3b82f6' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-[var(--border)] p-3 text-center">
                <p className="text-xs text-[var(--text-muted)]">{label}</p>
                <p className="text-xl font-bold" style={{ color }}>{(value ?? 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score Distribution */}
        <div className="card p-5">
          <h2 className="mb-1 text-base font-semibold text-[var(--text-primary)]">Score Distribution</h2>
          <p className="mb-4 text-xs text-[var(--text-muted)]">Fraud probability across all predictions</p>
          {!dist.data?.length || dist.data.every(b => b.count === 0) ? (
            <div className="flex h-48 items-center justify-center text-sm text-[var(--text-muted)]">
              No predictions yet — upload CSV to populate
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dist.data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {(dist.data || []).map((_, i) => (
                    <Cell key={i} fill={['#10b981','#3b82f6','#f59e0b','#f97316','#ef4444'][i] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Fraud Trend */}
        <div className="card p-5">
          <h2 className="mb-1 text-base font-semibold text-[var(--text-primary)]">Fraud Trend</h2>
          <p className="mb-4 text-xs text-[var(--text-muted)]">Daily fraud vs total predictions</p>
          {!fraudTrend.data?.length ? (
            <div className="flex h-48 items-center justify-center text-sm text-[var(--text-muted)]">
              No trend data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={fraudTrend.data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="fraud" stroke="#ef4444" strokeWidth={2} dot={false} name="Fraud" />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} name="Total" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Analyst Feedback */}
      <div className="card p-5">
        <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Analyst Feedback Mix</h2>
        {feedback.isLoading ? (
          <div className="h-12 animate-pulse bg-[var(--bg-secondary)] rounded-xl" />
        ) : feedback.isError ? (
          <p className="text-sm text-[var(--text-muted)]">No feedback data available yet.</p>
        ) : !feedback.data?.by_label?.length ? (
          <p className="text-sm text-[var(--text-muted)]">No analyst feedback labels yet. Review cases to generate feedback.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={feedback.data.by_label} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}>
                {feedback.data.by_label.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
