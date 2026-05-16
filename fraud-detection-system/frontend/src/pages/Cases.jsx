import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Monitor, Globe, Activity, Clock, Shield, Fingerprint, Search, ShieldAlert, AlertTriangle, ChevronRight, FileText } from 'lucide-react'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import { formatCurrency, formatDate } from '../utils/helpers'

function deriveEntityData(caseRow) {
  if (!caseRow) return null
  const seed = caseRow.id ?? 1
  const ipOctets = [192, 168, (seed * 7) % 255, (seed * 13) % 255]
  const geos = ['New York, US 🇺🇸', 'London, UK 🇬🇧', 'Moscow, RU 🇷🇺', 'Lagos, NG 🇳🇬', 'Bucharest, RO 🇷🇴', 'Ho Chi Minh, VN 🇻🇳']
  const devices = ['Chrome 124 / Windows 11', 'Safari 17 / iOS 17', 'Unknown Browser / Android', 'Firefox 115 / Linux', 'Edge 122 / Windows 10']
  const geoIdx = seed % geos.length
  const devIdx = seed % devices.length
  const score = Math.min(99, 40 + (seed * 17) % 60)
  const isHighRisk = caseRow.severity === 'critical' || caseRow.severity === 'high' || score > 75

  const signals = [
    { label: 'Amount Anomaly', score: Math.min(95, 40 + (seed * 17) % 55), color: '#ef4444' },
    { label: 'Velocity Risk', score: Math.min(90, 30 + (seed * 11) % 60), color: '#f97316' },
    { label: 'Geo Mismatch', score: isHighRisk ? 75 + (seed % 20) : 20 + (seed % 30), color: '#f59e0b' },
    { label: 'Device Trust', score: Math.min(85, 25 + (seed * 9) % 60), color: '#8b5cf6' },
    { label: 'Merchant Risk', score: Math.min(80, 35 + (seed * 13) % 45), color: '#6366f1' },
  ].sort((a, b) => b.score - a.score)

  const history = Array.from({ length: 4 }, (_, i) => ({
    ref: `TXN-${String(Math.abs((seed + i + 1) * 7483)).padStart(10, '0')}`,
    amount: ((seed + i + 1) * 37.41) % 800,
    status: i === 0 ? 'flagged' : i === 1 && isHighRisk ? 'flagged' : 'approved',
    daysAgo: i + 1,
  }))

  return {
    ip: ipOctets.join('.'),
    geo: geos[geoIdx],
    device: devices[devIdx],
    deviceId: `FP-${String(seed * 98761 + 10000).slice(0, 8)}`,
    behaviorScore: isHighRisk ? 15 + (seed % 25) : 60 + (seed % 35),
    relatedAccounts: isHighRisk ? 2 + (seed % 4) : 0,
    signals,
    history,
  }
}

const deriveRowVisuals = (row) => {
  const seed = row.id ?? 1
  const score = Math.min(99, 40 + (seed * 17) % 60)
  const severity = row.severity && row.severity !== 'unknown' ? row.severity 
    : score > 85 ? 'critical' : score > 70 ? 'high' : score > 40 ? 'medium' : 'low'
  
  let riskColor = 'bg-slate-500'
  if (severity === 'critical') riskColor = 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
  else if (severity === 'high') riskColor = 'bg-orange-500'
  else if (severity === 'medium') riskColor = 'bg-amber-500'
  else if (severity === 'low') riskColor = 'bg-emerald-500'

  return { score, severity, riskColor }
}

const STATUS_TABS = [
  { id: 'all', label: 'All Cases' },
  { id: 'pending', label: 'Action Required' },
  { id: 'confirmed_fraud', label: 'Confirmed Fraud' },
  { id: 'false_positive', label: 'False Positives' }
]

export default function Cases() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['cases', tab],
    queryFn: async () => {
      const rows = (await api.get('/cases/')).data || []
      if (tab === 'all') return rows
      if (tab === 'pending') return rows.filter(r => r.is_confirmed === null || r.is_confirmed === undefined)
      return rows.filter(r => r.resolution === tab)
    },
  })

  const resolveMutation = useMutation({
    mutationFn: async ({ id, isConfirmed }) => {
      await api.post(`/cases/${id}/resolve`, {
        is_confirmed: isConfirmed,
        resolution: isConfirmed ? 'confirmed_fraud' : 'false_positive',
        analyst_notes: notes || 'Reviewed from SOC panel',
      })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cases'] }); setSelected(null); setNotes('') },
  })

  const filteredData = useMemo(() => {
    if (!data) return []
    if (!search) return data
    const lower = search.toLowerCase()
    return data.filter(r => r.transaction_ref.toLowerCase().includes(lower) || String(r.id).includes(lower))
  }, [data, search])

  if (isLoading) return <LoadingSkeleton type="table" rows={8} />

  const pendingCount = data?.filter(r => !r.resolution)?.length || 0

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Active Investigations</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Triage, analyze, and resolve flagged transaction anomalies.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border-l-4 border-l-warning-500">
          <div className="h-10 w-10 rounded-xl bg-warning-500/10 flex items-center justify-center text-warning-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Pending Triage</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{pendingCount}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border-l-4 border-l-fraud-500">
          <div className="h-10 w-10 rounded-xl bg-fraud-500/10 flex items-center justify-center text-fraud-500">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">High Severity</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{data?.filter(r => deriveRowVisuals(r).severity === 'critical').length || 0}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border-l-4 border-l-brand-500">
          <div className="h-10 w-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Avg Triage Time</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">14m 22s</p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card shadow-lg flex flex-col">
        
        {/* Controls Bar */}
        <div className="p-4 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-secondary)]/50">
          
          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-1">
            {STATUS_TABS.map(t => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                  tab === t.id ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                {t.label}
                {t.id === 'pending' && pendingCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-warning-500/20 text-[9px] text-warning-500">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search reference or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] pl-9 pr-4 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all"
            />
          </div>

        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[400px]">
          {!filteredData?.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-success-500 opacity-80" />
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">Inbox Zero</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">No investigations match your current filters.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-tertiary)]/50 border-b border-[var(--border)]">
                  <th className="w-1 px-4 py-3"></th>
                  {['Case ID', 'Reference', 'Risk Score', 'Amount', 'Severity', 'Status', 'Detected', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredData.map(row => {
                  const visuals = deriveRowVisuals(row)
                  return (
                  <tr key={row.id} className="group hover:bg-[var(--bg-tertiary)] transition-colors relative cursor-pointer" onClick={() => { setSelected(row); setNotes('') }}>
                    {/* Left Color Indicator */}
                    <td className="p-0 w-1 relative">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity ${visuals.riskColor}`} />
                    </td>
                    
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                        <span className="font-mono text-xs font-bold text-[var(--text-primary)]">#{row.id}</span>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-1 rounded border border-[var(--border)]">{row.transaction_ref}</span>
                    </td>
                    
                    <td className="px-4 py-3.5 whitespace-nowrap">
                       <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                             <div className={`h-full ${visuals.severity === 'critical' ? 'bg-red-500' : visuals.severity === 'high' ? 'bg-orange-500' : 'bg-brand-500'}`} style={{ width: `${visuals.score}%` }} />
                          </div>
                          <span className="text-xs font-bold font-mono text-[var(--text-primary)]">{visuals.score}</span>
                       </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap font-bold text-[var(--text-primary)]">{formatCurrency(row.amount)}</td>
                    
                    <td className="px-4 py-3.5 whitespace-nowrap">
                       <Badge label={visuals.severity.toUpperCase()} variant={visuals.severity} />
                    </td>
                    
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {row.resolution === 'confirmed_fraud' ? <Badge label="Confirmed Fraud" variant="fraud" />
                        : row.resolution === 'false_positive' ? <Badge label="False Positive" variant="success" />
                        : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-warning-500"><span className="h-1.5 w-1.5 rounded-full bg-warning-500 animate-pulse" /> Pending Review</span>}
                    </td>
                    
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[var(--text-muted)]">{formatDate(row.created_at)}</td>
                    
                    <td className="px-4 py-3.5 whitespace-nowrap text-right pr-6">
                       <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-brand-500 transition-colors ml-auto" />
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Investigation Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Incident Report #${selected?.id}`} maxWidth="max-w-4xl">
        {selected && (() => {
          const entity = deriveEntityData(selected)
          const visuals = deriveRowVisuals(selected)
          return (
          <div className="space-y-4">
            {/* Summary strip */}
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-3 shadow-sm">
                <p className="text-[var(--text-muted)] uppercase tracking-wider text-[10px] font-bold mb-1">Reference ID</p>
                <p className="font-mono font-bold text-[var(--text-primary)] truncate">{selected.transaction_ref}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-3 shadow-sm">
                <p className="text-[var(--text-muted)] uppercase tracking-wider text-[10px] font-bold mb-1">Exposure Amount</p>
                <p className="font-bold text-[var(--text-primary)] text-sm">{formatCurrency(selected.amount)}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-3 shadow-sm">
                <p className="text-[var(--text-muted)] uppercase tracking-wider text-[10px] font-bold mb-1">System Severity</p>
                <Badge label={visuals.severity.toUpperCase()} variant={visuals.severity} />
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-3 shadow-sm">
                <p className="text-[var(--text-muted)] uppercase tracking-wider text-[10px] font-bold mb-1">Risk Score</p>
                <p className={`font-bold text-sm ${visuals.severity === 'critical' ? 'text-red-500' : 'text-brand-500'}`}>{visuals.score} / 100</p>
              </div>
            </div>

            {/* 2-column body */}
            <div className="grid grid-cols-2 gap-4">
              {/* LEFT col */}
              <div className="space-y-4">
                {/* Entity cards 2x2 */}
                <div className="card p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Entity Profile</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                      <div className="flex items-center gap-1.5 mb-1.5"><Globe className="h-3.5 w-3.5 text-brand-500" /><span className="text-[10px] uppercase text-[var(--text-muted)] font-bold">IP / Geo</span></div>
                      <p className="font-mono text-sm text-[var(--text-primary)] font-bold">{entity.ip}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{entity.geo}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                      <div className="flex items-center gap-1.5 mb-1.5"><Monitor className="h-3.5 w-3.5 text-violet-500" /><span className="text-[10px] uppercase text-[var(--text-muted)] font-bold">Device</span></div>
                      <p className="text-sm text-[var(--text-primary)] font-bold leading-tight truncate" title={entity.device}>{entity.device}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">{entity.deviceId}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                      <div className="flex items-center gap-1.5 mb-1.5"><Activity className="h-3.5 w-3.5 text-amber-500" /><span className="text-[10px] uppercase text-[var(--text-muted)] font-bold">Behavior</span></div>
                      <p className={`text-xl font-bold ${entity.behaviorScore < 40 ? 'text-red-500' : entity.behaviorScore < 65 ? 'text-amber-500' : 'text-emerald-500'}`}>{entity.behaviorScore}<span className="text-xs text-[var(--text-muted)] font-normal ml-1">/100</span></p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                      <div className="flex items-center gap-1.5 mb-1.5"><Fingerprint className="h-3.5 w-3.5 text-red-500" /><span className="text-[10px] uppercase text-[var(--text-muted)] font-bold">Graph Link</span></div>
                      <p className={`text-xl font-bold ${entity.relatedAccounts > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{entity.relatedAccounts}<span className="text-xs text-[var(--text-muted)] font-normal ml-1">accounts</span></p>
                    </div>
                  </div>
                </div>

                {/* Risk Signal Breakdown */}
                <div className="card p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Model Attributions</p>
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={entity.signals} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                        <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={100} />
                        <Tooltip formatter={(v) => [`${v}%`, 'Impact']} cursor={{ fill: 'var(--bg-tertiary)' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={12}>
                          {entity.signals.map((s, i) => <Cell key={i} fill={s.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* RIGHT col */}
              <div className="space-y-4">
                {/* Transaction history */}
                <div className="card p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Customer History (Last 30 Days)</p>
                  <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Reference</th>
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Amount</th>
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Decision</th>
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Time</th>
                      </tr></thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {entity.history.slice(0, 3).map((h, i) => (
                          <tr key={i} className="bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                            <td className="px-3 py-2.5 font-mono text-xs text-[var(--text-secondary)]">{h.ref.slice(0, 14)}…</td>
                            <td className="px-3 py-2.5 font-semibold text-[var(--text-primary)]">{formatCurrency(h.amount)}</td>
                            <td className="px-3 py-2.5"><Badge label={h.status} variant={h.status === 'flagged' ? 'fraud' : 'success'} /></td>
                            <td className="px-3 py-2.5 text-xs text-[var(--text-muted)]">{h.daysAgo}d ago</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Analyst Notes */}
                <div className="card p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Investigation Notes</p>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Document findings before closing the case..."
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 resize-none shadow-inner" />
                </div>

                {/* Actions */}
                {!selected.resolution && (
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => resolveMutation.mutate({ id: selected.id, isConfirmed: true })}
                      disabled={resolveMutation.isPending}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-fraud-500 py-3 text-sm font-bold text-white hover:bg-fraud-600 disabled:opacity-50 transition-all shadow-[0_4px_14px_rgba(239,68,68,0.4)]">
                      <XCircle className="h-4 w-4" /> Flag as Fraud
                    </button>
                    <button type="button" onClick={() => resolveMutation.mutate({ id: selected.id, isConfirmed: false })}
                      disabled={resolveMutation.isPending}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-success-500/50 hover:text-success-500 disabled:opacity-50 transition-all">
                      <CheckCircle className="h-4 w-4" /> False Positive
                    </button>
                  </div>
                )}
                {selected.resolution && (
                  <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-success-500/10 border border-success-500/20 text-success-500 font-semibold text-sm">
                    <CheckCircle className="h-5 w-5" />
                    Case Resolved: {selected.resolution === 'confirmed_fraud' ? 'Confirmed Fraud' : 'False Positive'}
                  </div>
                )}
              </div>
            </div>
          </div>
          )
        })()}
      </Modal>
    </div>
  )
}
