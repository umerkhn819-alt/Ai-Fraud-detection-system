import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, DollarSign, ShieldAlert, Upload, Radio } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/ui/StatCard'
import FraudLineChart from '../components/charts/FraudLineChart'
import FraudDonutChart from '../components/charts/FraudDonutChart'
import FraudTypesPieChart from '../components/charts/FraudTypesPieChart'
import RiskTimeline from '../components/charts/RiskTimeline'
import ThreatMap from '../components/charts/ThreatMap'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import * as txSvc from '../services/transactionService'
import { formatCurrency } from '../utils/helpers'

export default function Dashboard() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const canReset = user?.role === 'admin'

  const resetMutation = useMutation({
    mutationFn: txSvc.resetData,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['fraud-over-time'] })
    },
  })

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: timeData, isLoading: loadingTime } = useQuery({
    queryKey: ['fraud-over-time'],
    queryFn: () => api.get('/dashboard/fraud-over-time').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
    refetchInterval: 30000,
  })

  if (loadingStats) return <LoadingSkeleton type="stat" />

  const legit = (stats?.total_transactions ?? 0) - (stats?.total_fraud_detected ?? 0)

  const STAT_CARDS = [
    {
      title: 'Analyzed Events',
      rawValue: stats?.total_transactions,
      icon: Activity,
      accentClass: 'from-brand-500 to-brand-700',
      subtitle: 'All time ingested',
    },
    {
      title: 'Threats Prevented',
      rawValue: stats?.total_fraud_detected,
      icon: ShieldAlert,
      accentClass: 'from-fraud-500 to-fraud-700',
      subtitle: `${stats?.fraud_rate_percent ?? 0}% of transactions`,
      trend: 'up',
      trendValue: `${stats?.fraud_rate_percent ?? 0}%`,
    },
    {
      title: 'Protected Revenue',
      rawValue: stats?.total_amount_processed,
      format: v => formatCurrency(v),
      icon: DollarSign,
      accentClass: 'from-success-500 to-success-600',
      subtitle: `Fraud: ${formatCurrency(stats?.total_fraud_amount)}`,
    },
    {
      title: 'Investigations Queued',
      rawValue: stats?.pending_review_count,
      icon: AlertTriangle,
      accentClass: 'from-warning-500 to-warning-600',
      subtitle: 'Cases awaiting review',
      trend: stats?.pending_review_count > 0 ? 'up' : 'neutral',
      trendValue: stats?.pending_review_count > 0 ? 'Needs attention' : 'Clear',
    },
  ]

  return (
    <div className="space-y-5">

      {/* Header + Monitoring Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Fraud Intelligence Dashboard</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <p className="text-xs text-emerald-500 font-medium">Active Monitoring — Live · Auto-refresh 30s</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/predict"
            id="upload-csv-btn"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-glow-brand hover:opacity-90 transition-all"
          >
            <Upload className="h-4 w-4" />
            Batch Analysis
          </Link>
          {canReset && (
            <button
              id="reset-data-btn"
              type="button"
              onClick={() => {
                if (confirm('⚠️ Reset all transaction, prediction, case, and alert data? This cannot be undone.')) {
                  resetMutation.mutate()
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-fraud-500/30 px-4 py-2 text-sm font-medium text-fraud-500 hover:bg-fraud-500/5 transition-all"
            >
              {resetMutation.isPending ? 'Resetting…' : 'Reset Data'}
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map(card => <StatCard key={card.title} {...card} />)}
      </div>

      {/* Row 1: Threat Velocity (wide) + Decision Outcomes (narrow) */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Threat Velocity</h2>
            <span className="flex items-center gap-1.5 rounded-full bg-success-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-success-500">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
              LIVE
            </span>
          </div>
          {loadingTime
            ? <div className="shimmer h-52 rounded-xl" />
            : <FraudLineChart data={Array.isArray(timeData) ? timeData : []} />
          }
        </div>

        <div className="card p-5 flex flex-col">
          <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Decision Outcomes</h2>
          <div className="flex-1 flex items-center justify-center">
            <FraudDonutChart legit={legit} fraud={stats?.total_fraud_detected ?? 0} />
          </div>
        </div>
      </div>

      {/* Row 2: Fraud Type Breakdown + Threat Map + 24h Risk Timeline */}
      <div className="grid gap-5 lg:grid-cols-3 xl:grid-cols-3">
        <div className="card p-5 flex flex-col h-[380px]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Fraud Type Breakdown</h2>
            <span className="text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-full">Model-estimated</span>
          </div>
          <FraudTypesPieChart fraudCount={stats?.total_fraud_detected ?? 0} />
        </div>

        <div className="card p-5 flex flex-col h-[380px]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Location-wise Fraud</h2>
            <span className="text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-full">United States</span>
          </div>
          <ThreatMap />
        </div>

        <div className="card p-5 flex flex-col h-[380px]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">24h Risk Timeline</h2>
            <span className="flex items-center gap-1.5 text-[10px] text-violet-400 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
              Anomaly detection
            </span>
          </div>
          <RiskTimeline />
        </div>
      </div>

    </div>
  )
}
