import { useQuery } from '@tanstack/react-query'
import { Download, FileText, BarChart3, Shield, Clock } from 'lucide-react'
import api from '../services/api'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import { formatCurrency } from '../utils/helpers'

async function downloadBlob(url, filename) {
  const res = await api.get(url, { responseType: 'blob' })
  const href = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
  URL.revokeObjectURL(href)
}

export default function Reports() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['report-summary'],
    queryFn: () => api.get('/reports/summary').then(r => r.data),
  })

  if (isLoading) return <LoadingSkeleton rows={4} />

  const ov = summary?.overview ?? {}
  const cases = summary?.cases ?? {}
  const sev = summary?.severity_breakdown ?? {}
  const week = summary?.recent_7d ?? {}

  const STAT_CARDS = [
    { icon: BarChart3, label: 'Total Transactions', value: ov.total_transactions?.toLocaleString() ?? '—', accent: 'from-brand-500 to-brand-700' },
    { icon: Shield, label: 'Total Fraud Detected', value: ov.total_fraud_detected?.toLocaleString() ?? '—', accent: 'from-fraud-500 to-fraud-700' },
    { icon: FileText, label: 'Cases Resolved', value: `${cases.confirmed_fraud ?? 0} + ${cases.false_positives ?? 0} FP`, accent: 'from-success-500 to-success-600' },
    { icon: Clock, label: 'This Week (Fraud)', value: `${week.fraud_detected ?? 0} / ${week.predictions ?? 0}`, accent: 'from-warning-500 to-warning-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reports</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">Generated at: {summary?.generated_at ? new Date(summary.generated_at).toLocaleString() : '—'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => downloadBlob('/reports/cases.csv', 'cases_report.csv')}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-brand-500 hover:text-brand-500 transition-all">
            <Download className="h-4 w-4" />Cases CSV
          </button>
          <button type="button" onClick={() => downloadBlob('/reports/predictions.csv', 'predictions_report.csv')}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-brand-500 hover:text-brand-500 transition-all">
            <Download className="h-4 w-4" />Predictions CSV
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map(c => (
          <div key={c.label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{c.label}</p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{c.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.accent}`}>
                <c.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className={`mt-4 h-0.5 rounded-full bg-gradient-to-r ${c.accent} opacity-40`} />
          </div>
        ))}
      </div>

      {/* Overview + Severity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5 space-y-3">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Financial Overview</h2>
          {[
            ['Total Amount Processed', formatCurrency(ov.total_amount_processed)],
            ['Total Fraud Amount', formatCurrency(ov.total_fraud_amount)],
            ['Fraud Rate', `${ov.fraud_rate_percent ?? 0}%`],
            ['Avg Fraud Probability', ov.avg_fraud_probability ? (ov.avg_fraud_probability * 100).toFixed(2) + '%' : '—'],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2.5">
              <span className="text-xs text-[var(--text-secondary)]">{label}</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{val}</span>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Severity Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(sev).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No predictions yet</p>
            ) : Object.entries(sev).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
              const total = Object.values(sev).reduce((a, b) => a + b, 0)
              const pct = total ? (count / total * 100).toFixed(1) : 0
              const colors = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' }
              return (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="capitalize font-medium text-[var(--text-secondary)]">{label}</span>
                    <span className="font-bold text-[var(--text-primary)]">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[label] || '#6366f1' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Cases Summary */}
      <div className="card p-5">
        <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Cases Summary</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Total Cases', cases.total ?? 0, 'brand'],
            ['Pending Review', cases.pending ?? 0, 'warning'],
            ['Confirmed Fraud', cases.confirmed_fraud ?? 0, 'fraud'],
            ['False Positives', cases.false_positives ?? 0, 'success'],
          ].map(([label, val, color]) => (
            <div key={label} className="rounded-xl border border-[var(--border)] p-3 text-center">
              <p className="text-xs text-[var(--text-muted)]">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${
                color === 'fraud' ? 'text-fraud-500' :
                color === 'warning' ? 'text-warning-500' :
                color === 'success' ? 'text-success-500' : 'text-brand-500'
              }`}>{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
