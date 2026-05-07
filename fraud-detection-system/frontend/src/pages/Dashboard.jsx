import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import StatCard from '../components/ui/StatCard'
import FraudLineChart from '../components/charts/FraudLineChart'
import FraudDonutChart from '../components/charts/FraudDonutChart'
import Table from '../components/ui/Table'
import { formatCurrency, formatDate } from '../utils/helpers'

export default function Dashboard() {
  const { data: stats, isLoading: s1 } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
  })
  const { data: timeData, isLoading: s2 } = useQuery({
    queryKey: ['fraud-over-time'],
    queryFn: () => api.get('/dashboard/fraud-over-time').then((r) => r.data),
  })
  const { data: recent } = useQuery({
      queryKey: ['transactions-recent'],
      queryFn: () => api.get('/transactions/', { params: { limit: 8 } }).then((r) => r.data),
  })

  if (s1 || !stats) {
    return <div className="flex h-96 items-center justify-center text-slate-500">Loading dashboard…</div>
  }

  const legit = stats.total_transactions - stats.total_fraud_detected

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics dashboard</h1>
        <p className="text-sm text-slate-500">Real-time fraud signals from your API</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total transactions" value={stats.total_transactions.toLocaleString()} borderClass="border-l-blue-500" />
        <StatCard title="Fraud detected" value={stats.total_fraud_detected} borderClass="border-l-red-500" />
        <StatCard title="Fraud rate" value={`${stats.fraud_rate_percent}%`} borderClass="border-l-amber-500" />
        <StatCard title="Pending review" value={stats.pending_review_count} borderClass="border-l-violet-500" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Fraud over time</h2>
          {s2 ? (
            <p className="text-sm text-slate-400">Loading chart…</p>
          ) : (
            <FraudLineChart data={timeData} />
          )}
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Outcome split</h2>
          <FraudDonutChart legit={legit} fraud={stats.total_fraud_detected} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Recent transactions</h2>
        <Table
          empty="No transactions yet"
          columns={[
            { key: 'transaction_ref', label: 'Ref' },
            { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
            { key: 'status', label: 'Status' },
            { key: 'timestamp', label: 'When', render: (r) => formatDate(r.timestamp) },
          ]}
          data={recent || []}
        />
      </div>
    </div>
  )
}
