import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import FraudLineChart from '../components/charts/FraudLineChart'
import ConfusionMatrix from '../components/charts/ConfusionMatrix'
import Table from '../components/ui/Table'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function Analytics() {
  const { data: timeData } = useQuery({
    queryKey: ['fraud-over-time'],
    queryFn: () => api.get('/dashboard/fraud-over-time').then((r) => r.data),
  })
  const { data: severity } = useQuery({
    queryKey: ['severity-distribution'],
    queryFn: () => api.get('/dashboard/severity-distribution').then((r) => r.data),
  })
  const { data: merchants } = useQuery({
    queryKey: ['top-merchants'],
    queryFn: () => api.get('/dashboard/top-merchants', { params: { limit: 8 } }).then((r) => r.data),
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Deep analytics</h1>
        <p className="text-sm text-slate-500">Severity mix, merchants, and scoring trends</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">Trends</h2>
          <FraudLineChart data={timeData} />
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">Severity distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={severity || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="severity" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold text-slate-800">Top fraud merchants (by volume)</h2>
          <Table
            columns={[
              { key: 'merchant', label: 'Merchant' },
              { key: 'count', label: 'Flagged txns' },
            ]}
            data={merchants || []}
            empty="Upload transactions with merchant_name to populate"
          />
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">Confusion matrix (demo)</h2>
          <p className="mb-4 text-xs text-slate-500">
            Wire this to your evaluation notebook export or a `/metrics` API when available.
          </p>
          <ConfusionMatrix tp={42} tn={120400} fp={80} fn={38} />
        </div>
      </div>
    </div>
  )
}
