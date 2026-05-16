import { useQuery } from '@tanstack/react-query'
import { Activity, Clock, FileText, User } from 'lucide-react'
import api from '../services/api'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'

const ACTION_ICONS = {
  create_transaction: Activity,
  upload_csv: FileText,
  predict: Activity,
  reset_data: FileText,
  login: User,
}
const ACTION_COLORS = {
  create_transaction: 'text-brand-500 bg-brand-500/10',
  upload_csv: 'text-violet-500 bg-violet-500/10',
  predict: 'text-success-500 bg-success-500/10',
  reset_data: 'text-fraud-500 bg-fraud-500/10',
  login: 'text-warning-500 bg-warning-500/10',
}

export default function Audit() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: async () => (await api.get('/audit/?limit=200')).data,
  })

  if (isLoading) return <LoadingSkeleton rows={6} />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Audit Timeline</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">Complete system activity log for compliance</p>
      </div>

      <div className="card p-5">
        {!(data?.length) ? (
          <div className="py-12 text-center text-sm text-[var(--text-muted)]">No audit logs yet</div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-[var(--border)]" />
            <div className="space-y-4">
              {data.map(row => {
                const Icon = ACTION_ICONS[row.action] || Clock
                const colorCls = ACTION_COLORS[row.action] || 'text-[var(--text-muted)] bg-[var(--bg-tertiary)]'
                return (
                  <div key={row.id} className="relative flex gap-4 pl-12">
                    <div className={`absolute left-2.5 flex h-5 w-5 items-center justify-center rounded-full ${colorCls}`}>
                      <Icon className="h-2.5 w-2.5" />
                    </div>
                    <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[var(--text-primary)] capitalize">{row.action.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{new Date(row.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-[var(--text-muted)]">
                        {row.resource && <span>Resource: <strong className="text-[var(--text-secondary)]">{row.resource}</strong></span>}
                        {row.resource_id && <span>ID: <strong className="text-[var(--text-secondary)]">#{row.resource_id}</strong></span>}
                        {row.ip_address && <span>IP: {row.ip_address}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
