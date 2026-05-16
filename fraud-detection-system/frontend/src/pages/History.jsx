import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as pred from '../services/predictionService'
import Badge from '../components/ui/Badge'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import { formatDate } from '../utils/helpers'

const FILTERS = ['all', 'fraud', 'safe']

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

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Prediction History</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">All scored transactions with ML verdict</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-1">
          {FILTERS.map(f => (
            <button key={f} type="button" onClick={() => { setPage(1); setFilter(f) }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                filter === f ? 'bg-brand-500 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}>{f}</button>
          ))}
        </div>
      </div>

      {isLoading ? <LoadingSkeleton type="table" rows={8} /> : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {['ID', 'Verdict', 'Risk Score', 'Severity', 'Model', 'Predicted At'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {!(data?.items?.length) ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)]">
                            <svg className="h-7 w-7 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-[var(--text-secondary)]">No history data available yet</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">Upload a CSV to populate prediction history</p>
                        </div>
                      </td>
                    </tr>
                  ) : data.items.map(row => (
                    <tr key={row.id} className="hover:bg-brand-500/5 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-primary)]">#{row.id}</td>
                      <td className="px-4 py-3">
                        <Badge label={row.is_fraud ? 'FRAUD' : 'SAFE'} variant={row.is_fraud ? 'fraud' : 'success'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${(row.fraud_probability * 100).toFixed(0)}%`,
                              background: row.fraud_probability > 0.7 ? '#ef4444' : row.fraud_probability > 0.4 ? '#f59e0b' : '#10b981',
                            }} />
                          </div>
                          <span className="text-xs font-semibold text-[var(--text-primary)]">{(row.fraud_probability * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={row.severity || 'unknown'} variant={row.severity || 'default'} />
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{row.model_version}</td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{formatDate(row.predicted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
            <span>Page {data?.page ?? 1} of {totalPages} · {data?.total ?? 0} total</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs disabled:opacity-40 hover:border-brand-500 hover:text-brand-500 transition-all">
                Previous
              </button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs disabled:opacity-40 hover:border-brand-500 hover:text-brand-500 transition-all">
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
