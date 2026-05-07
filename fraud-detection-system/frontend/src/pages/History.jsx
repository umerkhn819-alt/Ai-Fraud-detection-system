import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as pred from '../services/predictionService'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import { formatDate } from '../utils/helpers'

export default function History() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['history', page, filter],
    queryFn: () => {
      const params = { page, page_size: 15 }
      if (filter === 'fraud') params.is_fraud = true
      if (filter === 'safe') params.is_fraud = false
      return pred.listHistory(params)
    },
  })

  if (isLoading || !data) {
    return <div className="flex h-64 items-center justify-center text-slate-500">Loading history…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Prediction history</h1>
        <div className="flex gap-2">
          {['all', 'fraud', 'safe'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setPage(1)
                setFilter(f)
              }}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
                filter === f ? 'bg-brand-600 text-white' : 'bg-white ring-1 ring-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <Table
        columns={[
          { key: 'id', label: 'ID' },
          {
            key: 'is_fraud',
            label: 'Verdict',
            render: (r) => <Badge variant={r.is_fraud ? 'danger' : 'success'}>{r.is_fraud ? 'Fraud' : 'OK'}</Badge>,
          },
          {
            key: 'fraud_probability',
            label: 'Risk',
            render: (r) => `${(r.fraud_probability * 100).toFixed(1)}%`,
          },
          { key: 'severity', label: 'Severity' },
          { key: 'predicted_at', label: 'At', render: (r) => formatDate(r.predicted_at) },
        ]}
        data={data.items}
      />

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {data.page} of {Math.max(1, Math.ceil(data.total / data.page_size))} ({data.total} total)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page * data.page_size >= data.total}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
