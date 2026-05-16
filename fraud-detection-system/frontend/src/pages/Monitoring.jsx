import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Clock, ShieldAlert, TrendingUp, Zap } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../services/api'
import LiveMonitor from '../components/LiveMonitor'
import { useAuth } from '../context/AuthContext'

const STAT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444']

function StatCard({ title, value, sub, icon: Icon, color = '#6366f1' }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: color + '22' }}>
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)] truncate">{value}</p>
        {sub && <p className="text-xs text-[var(--text-muted)]">{sub}</p>}
      </div>
    </div>
  )
}

export default function Monitoring() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id?.toString() || "default"

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['monitoring-live'],
    queryFn: async () => {
      const r = await api.get('/monitoring/live')
      return r.data
    },
    refetchInterval: 10000,
    retry: 2,
  })

  const dist = useQuery({
    queryKey: ['monitoring-distribution'],
    queryFn: async () => {
      const r = await api.get('/monitoring/distribution')
      return r.data
    },
    refetchInterval: 30000,
    retry: 2,
  })

  // If loading, show skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Live Monitoring</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">Real-time fraud detection signals</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="card p-5 h-24 animate-pulse bg-[var(--bg-secondary)]" />
          ))}
        </div>
      </div>
    )
  }

  // Error state — show details + retry guidance
  if (isError) {
    const msg = error?.response?.data?.detail || error?.message || 'Unknown error'
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Live Monitoring</h1>
        </div>
        <div className="card border-amber-500/20 p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-amber-500">Connection Error</h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Could not load monitoring data. Please ensure the backend is running.
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Detail: {msg}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const d = data || {}
  const noData = !d.total_transactions

  const stats = [
    { title: 'Transactions (1h)', value: (d.transactions_last_hour ?? 0).toLocaleString(), sub: `${d.predictions_last_hour ?? 0} scored`, icon: Clock, color: '#6366f1' },
    { title: 'Fraud Detected (1h)', value: (d.fraud_last_hour ?? 0).toLocaleString(), sub: `${(d.fraud_rate_last_hour ?? 0).toFixed(2)}% rate`, icon: ShieldAlert, color: '#ef4444' },
    { title: 'Transactions (24h)', value: (d.transactions_last_24h ?? 0).toLocaleString(), sub: `${d.predictions_last_24h ?? 0} scored`, icon: Activity, color: '#3b82f6' },
    { title: 'Total Fraud Rate', value: `${(d.fraud_rate_total ?? 0).toFixed(2)}%`, sub: `${(d.total_fraud ?? 0).toLocaleString()} of ${(d.total_predictions ?? 0).toLocaleString()}`, icon: TrendingUp, color: d.fraud_rate_total > 5 ? '#ef4444' : '#10b981' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Live Monitoring</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">Real-time fraud detection signals · auto-refreshes every 10s</p>
      </div>

      {noData && (
        <div className="card border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3">
          <Zap className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-500">
            No data yet. Upload <strong>creditcard.csv</strong> from the <strong>Predict</strong> page to populate monitoring metrics.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(s => <StatCard key={s.title} {...s} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LiveMonitor tenantId={tenantId} />
        
        <div className="card p-5 relative overflow-hidden h-full">
        {/* Glow effect for high threat */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-fraud-500/5 to-transparent pointer-events-none" />
        
        <h2 className="mb-1 text-base font-semibold text-[var(--text-primary)] relative z-10 flex items-center">
          <Zap className="h-4 w-4 mr-2 text-brand-500" />
          Logarithmic Threat Distribution
        </h2>
        <p className="mb-4 text-xs text-[var(--text-muted)] relative z-10">
          Fraud probability buckets scaled logarithmically to expose rare, high-threat anomalies.
        </p>
        
        {dist.isLoading ? (
          <div className="h-48 animate-pulse bg-[var(--bg-secondary)] rounded-xl relative z-10" />
        ) : !dist.data?.length || dist.data.every(b => b.count === 0) ? (
          <div className="flex h-48 items-center justify-center text-sm text-[var(--text-muted)] relative z-10">
            No scored transactions yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240} className="relative z-10">
            <BarChart
              data={(dist.data || []).map(d => ({
                ...d,
                // Give zero buckets a tiny floor so they're visible with a "0" label
                logCount: d.count > 0 ? Math.log10(d.count) : 0.05,
                originalCount: d.count
              }))}
              margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="safeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="medGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="highGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis
                tickFormatter={(val) => val === 0 ? '0' : `10^${val.toFixed(1)}`}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                domain={[0, 'auto']}
              />
              <Tooltip
                cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.4 }}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)' }}
                formatter={(value, name, props) => [
                  <span className="font-bold text-[var(--text-primary)]">{props.payload.originalCount.toLocaleString()}</span>,
                  'Transactions'
                ]}
              />
              <Bar dataKey="logCount" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11, fill: 'var(--text-muted)', formatter: (_, entry) => entry?.originalCount ?? '' }}>
                {(dist.data || []).map((_, i) => (
                  <Cell
                    key={i}
                    fill={i < 2 ? 'url(#safeGrad)' : i < 3 ? 'url(#medGrad)' : 'url(#highGrad)'}
                    stroke={i >= 3 ? '#ef4444' : 'none'}
                    strokeWidth={1}
                    opacity={dist.data[i].count === 0 ? 0.25 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        </div>
      </div>
    </div>
  )
}
