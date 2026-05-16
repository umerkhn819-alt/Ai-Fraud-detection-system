import { useEffect, useState, useRef } from 'react'
import { AlertCircle, CheckCircle, ShieldAlert, Zap, Clock, Wifi, WifiOff } from 'lucide-react'
import api from '../services/api'

export default function LiveMonitor({ tenantId = 'default' }) {
  const [events, setEvents] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const ws = useRef(null)

  // ── Seed with recent DB history on mount ─────────────────────────
  useEffect(() => {
    api.get('/history/', { params: { page: 1, page_size: 20 } })
      .then(r => {
        const items = r.data?.items || r.data || []
        const mapped = items.map(pred => ({
          event_type: 'payment',
          amount: pred.amount ?? 0,
          risk_level: pred.severity || (pred.is_fraud ? 'high' : 'low'),
          reasons: [],
          timestamp: pred.predicted_at,
          transaction_ref: `TXN-${pred.transaction_id}`,
          is_fraud: pred.is_fraud ?? false,
          _seeded: true,
        }))
        setEvents(mapped.slice(0, 20))
      })
      .catch(() => {/* silently ignore — WS will carry events anyway */})
      .finally(() => setSeeded(true))
  }, [tenantId])

  // ── WebSocket live stream ─────────────────────────────────────────
  useEffect(() => {
    if (!seeded) return
    const wsUrl = import.meta.env.DEV
      ? `ws://localhost:8000/ws/alerts/${tenantId}`
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/alerts/${tenantId}`

    const connect = () => {
      ws.current = new WebSocket(wsUrl)
      ws.current.onopen = () => setIsConnected(true)
      ws.current.onclose = () => {
        setIsConnected(false)
        setTimeout(connect, 3000)
      }
      ws.current.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data)
          data.timestamp = new Date().toISOString()
          setEvents(prev => [data, ...prev].slice(0, 50))
        } catch (e) { /* ignore */ }
      }
    }
    connect()
    return () => ws.current?.close()
  }, [tenantId, seeded])

  const getRiskBadge = (level) => {
    switch (level) {
      case 'critical': return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 flex items-center gap-1 whitespace-nowrap"><ShieldAlert className="w-3 h-3" />CRITICAL</span>
      case 'high':     return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 flex items-center gap-1 whitespace-nowrap"><AlertCircle className="w-3 h-3" />HIGH</span>
      case 'medium':   return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 flex items-center gap-1 whitespace-nowrap"><AlertCircle className="w-3 h-3" />MEDIUM</span>
      default:         return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 flex items-center gap-1 whitespace-nowrap"><CheckCircle className="w-3 h-3" />LOW</span>
    }
  }

  const fmtTime = (ts) => {
    if (!ts) return '—'
    try { return new Date(ts).toLocaleTimeString() } catch { return '—' }
  }

  return (
    <div className="card flex flex-col h-full border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-secondary)] shrink-0">
        <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-brand-500" />
          Live Transaction Stream
        </h3>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </span>
          {isConnected
            ? <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
          <span className={`text-xs font-mono font-bold ${isConnected ? 'text-emerald-500' : 'text-red-400'}`}>
            {isConnected ? 'STREAMING' : 'RECONNECTING'}
          </span>
        </div>
      </div>

      {/* Stream body */}
      <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 400 }}>
        {!seeded ? (
          <div className="p-6 space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-9 rounded-lg bg-[var(--bg-secondary)] animate-pulse" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center text-[var(--text-muted)] flex flex-col items-center justify-center gap-3">
            <Clock className="w-8 h-8 opacity-40" />
            <div>
              <p className="text-sm font-medium">Waiting for transactions…</p>
              <p className="text-xs mt-1 opacity-60">Run a simulation or upload CSV to see events here</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[var(--bg-secondary)] text-[var(--text-muted)] uppercase text-[10px] tracking-wider z-10">
              <tr>
                <th className="px-4 py-2.5">Time</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Risk</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              {events.map((ev, i) => (
                <tr
                  key={i}
                  className={`hover:bg-[var(--bg-tertiary)] transition-colors ${
                    !ev._seeded ? 'animate-in fade-in slide-in-from-top-1 duration-300' : ''
                  } ${ev.is_fraud || ['critical','high'].includes(ev.risk_level) ? 'border-l-2 border-l-red-500/50' : ''}`}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)] whitespace-nowrap">
                    {fmtTime(ev.timestamp)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-xs capitalize text-[var(--text-primary)]">
                    {ev.event_type || 'payment'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)]">
                    ${(ev.amount || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5">
                    {getRiskBadge(ev.risk_level)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--text-muted)] hidden md:table-cell font-mono truncate max-w-[120px]">
                    {ev.transaction_ref || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      {events.length > 0 && (
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-secondary)] shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-muted)]">
            Showing {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            {events.filter(e => ['critical','high'].includes(e.risk_level)).length} high risk
          </span>
        </div>
      )}
    </div>
  )
}
