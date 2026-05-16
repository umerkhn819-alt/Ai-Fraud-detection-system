import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Scale, Trash2 } from 'lucide-react'
import api from '../services/api'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'

const OPERATORS = ['gt', 'lt', 'gte', 'lte', 'eq']
const FIELDS = ['amount', 'time_seconds', 'v1', 'v2', 'v3', 'v4', 'v14', 'v17']

export default function Rules() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', field: 'amount', operator: 'gt', value: '1000', weight: '0.1', enabled: true })

  const { data, isLoading } = useQuery({
    queryKey: ['risk-rules'],
    queryFn: async () => (await api.get('/rules/')).data,
  })

  const save = useMutation({
    mutationFn: async () => (await api.post('/rules/', { ...form, value: String(form.value), weight: Number(form.weight), enabled: true })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risk-rules'] }); setForm(f => ({ ...f, name: '', value: '1000' })) },
  })

  const field = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (isLoading) return <LoadingSkeleton rows={3} />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Risk Rules</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">Business rules applied on top of ML predictions</p>
      </div>

      {/* Add rule form */}
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Add Rule</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[
            { label: 'Rule Name', key: 'name', type: 'text', placeholder: 'High Value Rule' },
            { label: 'Weight', key: 'weight', type: 'number', placeholder: '0.1' },
            { label: 'Threshold Value', key: 'value', type: 'text', placeholder: '1000' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">{label}</label>
              <input type={type} value={form[key]} onChange={e => field(key, e.target.value)} placeholder={placeholder}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Field</label>
            <select value={form.field} onChange={e => field('field', e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-brand-500">
              {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Operator</label>
            <select value={form.operator} onChange={e => field('operator', e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-brand-500">
              {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          </div>
        </div>
        <button type="button" onClick={() => save.mutate()} disabled={save.isPending || !form.name}
          className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all">
          <Scale className="h-4 w-4" />{save.isPending ? 'Saving…' : 'Save Rule'}
        </button>
      </div>

      {/* Rules list */}
      <div className="card overflow-hidden">
        {!data?.length ? (
          <div className="py-12 text-center text-sm text-[var(--text-muted)]">No rules configured yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['Name', 'Condition', 'Weight', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-brand-500/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{r.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{r.field} {r.operator} {r.value}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{r.weight}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.enabled ? 'bg-success-500/10 text-success-500' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                    }`}>{r.enabled ? '● Active' : '○ Disabled'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
