import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Bell, CheckCheck, Filter } from 'lucide-react'
import { useState } from 'react'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'

const SEV_FILTERS = ['all', 'critical', 'high', 'medium', 'low']

export default function Alerts() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['alerts-events'],
    queryFn: async () => (await api.get('/alerts/')).data,
    refetchInterval: 10000,
  })

  const ack = useMutation({
    mutationFn: async (id) => (await api.post(`/alerts/${id}/ack`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts-events'] }),
  })

  if (isLoading) return <LoadingSkeleton rows={5} />

  const filtered = (data || []).filter(r => filter === 'all' || r.severity === filter)
  const unread = (data || []).filter(r => !r.acknowledged).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Alerts</h1>
          {unread > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-fraud-500/10 border border-fraud-500/20 px-2.5 py-1 text-xs font-bold text-fraud-500">
              <span className="h-1.5 w-1.5 rounded-full bg-fraud-500 animate-pulse" />
              {unread} unread
            </span>
          )}
        </div>
        <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-1">
          {SEV_FILTERS.map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                filter === f ? 'bg-brand-500 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}>{f}</button>
          ))}
        </div>
      </div>

      {!filtered.length ? (
        <div className="card py-16 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)]/40" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">No alerts in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(row => (
            <div key={row.id} className={`card p-4 flex items-start justify-between gap-4 ${
              !row.acknowledged ? 'border-l-4 border-l-fraud-500' : 'opacity-60'
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${
                  row.severity === 'critical' ? 'text-fraud-500' :
                  row.severity === 'high' ? 'text-orange-500' :
                  row.severity === 'medium' ? 'text-warning-500' : 'text-success-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{row.message}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge label={row.severity} variant={row.severity} />
                    <span className="text-xs text-[var(--text-muted)]">{new Date(row.created_at).toLocaleString()}</span>
                    {row.acknowledged && <span className="text-xs text-success-500">✓ Acknowledged</span>}
                  </div>
                </div>
              </div>
              {!row.acknowledged && (
                <button type="button" onClick={() => ack.mutate(row.id)}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-success-500/30 px-2.5 py-1 text-xs font-medium text-success-500 hover:bg-success-500/10 transition-all">
                  <CheckCheck className="h-3.5 w-3.5" />Ack
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
