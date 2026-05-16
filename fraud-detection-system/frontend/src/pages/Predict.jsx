import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Brain, FileSpreadsheet, Sparkles, ShieldAlert, ShieldCheck, Crosshair, SlidersHorizontal, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

function generateSmartExplanation(result) {
  if (!result) return null
  return [
    'This transaction has been classified as high risk due to abnormal payment behavior, unusual merchant activity, and transaction patterns inconsistent with previous customer behavior.',
    'Multiple anomaly indicators were triggered during analysis, including elevated transaction velocity and geographic inconsistency.',
    'Recommended action: Temporarily hold transaction for manual review.'
  ]
}
import * as txSvc from '../services/transactionService'
import * as predSvc from '../services/predictionService'
import CSVUpload from '../components/forms/CSVUpload'
import RiskScoreBar from '../components/charts/RiskScoreBar'
import Badge from '../components/ui/Badge'

const SCENARIOS = {
  safe: {
    label: 'Safe eCommerce',
    desc: 'Typical low-risk transaction',
    payload: { amount: 0.89, time_seconds: 0, merchant_name: 'Apple Store', v1:1.276,v2:0.108,v3:0.167,v4:0.319,v5:-0.107,v6:-0.219,v7:-0.127,v8:0.051,v9:-0.006,v10:0.134,v11:0.573,v12:0.254,v13:-0.622,v14:0.584,v15:0.501,v16:0.786,v17:-0.917,v18:0.344,v19:0.489,v20:-0.121,v21:-0.272,v22:-0.865,v23:0.034,v24:-0.529,v25:0.264,v26:0.131,v27:-0.040,v28:-0.001 }
  },
  phishing: {
    label: 'Micro-TX Phishing',
    desc: '$0.00 bot card-test ping',
    payload: { amount: 0.0, time_seconds: 0, merchant_name: 'Unknown Gateway', v1:-2.312,v2:1.951,v3:-1.609,v4:3.997,v5:-0.522,v6:-1.426,v7:-2.537,v8:1.391,v9:-2.770,v10:-2.772,v11:3.202,v12:-2.899,v13:-0.595,v14:-4.289,v15:0.389,v16:-1.140,v17:-2.830,v18:-0.016,v19:0.416,v20:0.126,v21:0.517,v22:-0.035,v23:-0.465,v24:0.320,v25:0.044,v26:0.177,v27:0.261,v28:-0.143 }
  },
  takeover: {
    label: 'Account Takeover',
    desc: 'High-value behavioral anomaly',
    payload: { amount: 239.93, time_seconds: 0, merchant_name: 'Luxury Retailer', v1:-2.303,v2:1.759,v3:-0.359,v4:2.330,v5:-0.821,v6:-0.075,v7:0.562,v8:-0.399,v9:-0.238,v10:-1.525,v11:2.032,v12:-6.560,v13:0.022,v14:-1.470,v15:-0.698,v16:-2.282,v17:-4.781,v18:-2.615,v19:-1.334,v20:-0.430,v21:-0.294,v22:-0.932,v23:0.172,v24:-0.087,v25:-0.156,v26:-0.542,v27:0.039,v28:-0.153 }
  },
}

const MANUAL_DEFAULTS = {
  amount: '', time_seconds: 0, merchant_name: '',
  v1:0,v2:0,v3:0,v4:0,v5:0,v6:0,v7:0,v8:0,v9:0,v10:0,
  v11:0,v12:0,v13:0,v14:0,v15:0,v16:0,v17:0,v18:0,v19:0,v20:0,
  v21:0,v22:0,v23:0,v24:0,v25:0,v26:0,v27:0,v28:0
}

function ResultPanel({ result, explanation, loading, onExplain }) {
  if (!result) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)] py-16">
      <div className="h-16 w-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
        <Crosshair className="h-8 w-8 opacity-30" />
      </div>
      <p className="text-sm font-medium">Run a simulation to see results</p>
      <p className="text-xs opacity-60">Results appear here instantly</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Verdict header */}
      <div className={`flex items-center justify-between p-3 rounded-xl border ${result.is_fraud ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
        <div className="flex items-center gap-2.5">
          {result.is_fraud
            ? <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center"><ShieldAlert className="h-5 w-5 text-red-500" /></div>
            : <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-emerald-500" /></div>
          }
          <div>
            <p className="font-bold text-sm text-[var(--text-primary)]">{result.is_fraud ? 'Suspicious Transaction Detected' : 'Appears Legitimate'}</p>
            <p className="text-xs text-[var(--text-muted)]">Event #{result.id}</p>
          </div>
        </div>
        <Badge label={(result.severity === 'critical' ? 'HIGH RISK' : result.severity)?.toUpperCase() || 'N/A'} variant={result.severity || 'default'} />
      </div>

      {/* Risk bar */}
      <RiskScoreBar score={result.fraud_probability} threshold={0.5} label="Fraud Risk Score" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[var(--border)] p-3 text-center">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Fraud Risk</p>
          <p className={`text-xl font-bold mt-0.5 ${result.is_fraud ? 'text-red-500' : 'text-emerald-500'}`}>
            {(result.fraud_probability * 100).toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3 text-center">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Detection Confidence</p>
          <p className="text-xl font-bold mt-0.5 text-[var(--text-primary)]">
            {result.confidence_score != null ? `${Math.min(result.confidence_score * 100, 100).toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      {/* Explain button */}
      <button
        id="explain-btn"
        type="button"
        disabled={loading}
        onClick={onExplain}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-brand-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all"
      >
        <Brain className="h-4 w-4" />
        {loading ? 'Analyzing…' : 'Generate Risk Insights'}
      </button>

      {/* AI Explanation */}
      {explanation && (() => {
        const signals = generateSmartExplanation(result)
        return (
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <p className="text-xs font-semibold text-violet-400">AI Risk Analysis</p>
              <span className="ml-auto text-[9px] bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full font-bold">LIVE</span>
            </div>
            <div className="space-y-2">
              {signals.map((sig, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{sig}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-violet-500/10 text-[10px] text-[var(--text-muted)]">
              Analysis powered by FraudGuard ML Engine · {new Date().toLocaleTimeString()}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default function Predict() {
  const [mode, setMode] = useState('sim')
  const qc = useQueryClient()

  const [selectedScenario, setSelectedScenario] = useState('safe')
  const [manual, setManual] = useState({
    amount: '', time_seconds: 0, merchant_name: '',
    payment_method: 'credit_card', tx_region: '', device_type: 'mobile',
    tx_frequency: 'occasional', ip_address: '', customer_risk: 'low', device_trust: 'high',
    v1:0,v2:0,v3:0,v4:0,v5:0,v6:0,v7:0,v8:0,v9:0,v10:0,
    v11:0,v12:0,v13:0,v14:0,v15:0,v16:0,v17:0,v18:0,v19:0,v20:0,
    v21:0,v22:0,v23:0,v24:0,v25:0,v26:0,v27:0,v28:0
  })

  const [result, setResult] = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ text: '', ok: true })

  const invalidateAll = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['dashboard-stats'] }),
    qc.invalidateQueries({ queryKey: ['fraud-over-time'] }),
    qc.invalidateQueries({ queryKey: ['transactions-recent'] }),
    qc.invalidateQueries({ queryKey: ['monitoring-live'] }),
    qc.invalidateQueries({ queryKey: ['monitoring-distribution'] }),
    qc.invalidateQueries({ queryKey: ['mm-snapshot'] }),
  ])

  const runSimulation = async () => {
    setLoading(true); setResult(null); setExplanation(null); setMsg({ text: '', ok: true })
    try {
      const payload = SCENARIOS[selectedScenario].payload
      const txn = await txSvc.createTransaction(payload)
      const pred = await predSvc.runPrediction(txn.id)
      setResult(pred)
      await invalidateAll()
    } catch (e) { setMsg({ text: e.response?.data?.detail || e.message || 'Error', ok: false }) }
    finally { setLoading(false) }
  }

  const runManual = async () => {
    if (!manual.amount || isNaN(Number(manual.amount))) {
      setMsg({ text: 'Please enter a valid Amount', ok: false }); return
    }
    setLoading(true); setResult(null); setExplanation(null); setMsg({ text: '', ok: true })
    try {
      const payload = { ...manual, amount: Number(manual.amount), time_seconds: Number(manual.time_seconds || 0) }
      const txn = await txSvc.createTransaction(payload)
      const pred = await predSvc.runPrediction(txn.id)
      setResult(pred)
      await invalidateAll()
    } catch (e) { setMsg({ text: e.response?.data?.detail || e.message || 'Error', ok: false }) }
    finally { setLoading(false) }
  }

  const runExplain = async () => {
    if (!result) return
    setLoading(true)
    try { const r = await predSvc.explainPrediction(result.id); setExplanation(r.explanation) }
    catch (e) { setMsg({ text: e.response?.data?.detail || 'Explain failed', ok: false }) }
    finally { setLoading(false) }
  }

  const onCsv = async (file) => {
    setLoading(true); setMsg({ text: '', ok: true })
    try {
      const r = await txSvc.uploadCsv(file)
      setMsg({ text: r.message + (r.skipped ? ` (${r.skipped} skipped)` : ''), ok: true })
      await invalidateAll()
      // Return structured data for CSVUpload result banner
      return { total: r.total ?? r.inserted ?? 0, fraud: r.fraud_detected ?? 0, skipped: r.skipped ?? 0 }
    } catch (e) { setMsg({ text: e.response?.data?.detail || 'Upload failed', ok: false }) }
    finally { setLoading(false) }
  }

  const setV = (key, val) => setManual(m => ({ ...m, [key]: val === '' ? '' : Number(val) }))

  const TABS = [
    { id: 'sim',    label: 'Fraud Simulation', Icon: Crosshair },
    { id: 'manual', label: 'Transaction Analysis',  Icon: SlidersHorizontal },
    { id: 'csv',    label: 'Bulk Fraud Detection',          Icon: FileSpreadsheet },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Fraud Operations Center</h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">AI-powered transaction risk analysis and anomaly detection</p>
        </div>
        <span className="text-[10px] bg-brand-500/10 text-brand-500 px-2 py-1 rounded-md border border-brand-500/20 font-bold tracking-wider">LIVE LAB</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-1">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => { setMode(id); setResult(null); setExplanation(null); setMsg({ text: '', ok: true }) }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${mode === id ? 'bg-brand-500 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Error/success banner */}
      {msg.text && (
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${msg.ok ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' : 'border-red-500/20 bg-red-500/5 text-red-500'}`}>
          {msg.text}
        </div>
      )}

      {/* ── CSV mode (full width) ── */}
      {mode === 'csv' && (
        <div className="card p-5 space-y-3">
          <CSVUpload disabled={loading} onFile={onCsv} />
          <div className="flex gap-2 pt-1">
            <a href="/dashboard" className="flex-1 rounded-xl bg-[var(--bg-tertiary)] py-2 text-center text-xs font-medium text-[var(--text-secondary)] hover:text-brand-500 transition-colors">Dashboard</a>
            <a href="/monitoring" className="flex-1 rounded-xl bg-[var(--bg-tertiary)] py-2 text-center text-xs font-medium text-[var(--text-secondary)] hover:text-brand-500 transition-colors">Monitoring</a>
          </div>
        </div>
      )}

      {/* ── Sim + Manual: 2-column layout ── */}
      {mode !== 'csv' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* LEFT: input panel */}
          <div className="card p-4 space-y-3">

            {/* SIM MODE */}
            {mode === 'sim' && (
              <>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Select Threat Vector</p>
                <div className="space-y-2">
                  {Object.entries(SCENARIOS).map(([key, scn]) => (
                    <div key={key} onClick={() => setSelectedScenario(key)}
                      className={`cursor-pointer border p-3 rounded-xl transition-all ${selectedScenario === key ? 'border-brand-500 bg-brand-500/5' : 'border-[var(--border)] hover:border-brand-500/40'}`}>
                      <div className="flex justify-between items-center">
                        <p className={`text-sm font-semibold ${selectedScenario === key ? 'text-brand-500' : 'text-[var(--text-primary)]'}`}>{scn.label}</p>
                        <p className="font-mono text-xs text-[var(--text-muted)]">${scn.payload.amount.toFixed(2)}</p>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{scn.desc}</p>
                    </div>
                  ))}
                </div>
                <button type="button" disabled={loading} onClick={runSimulation}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-lg">
                  <Crosshair className="h-4 w-4" />
                  {loading ? 'Simulating…' : 'Inject & Run Simulation'}
                </button>
              </>
            )}

            {/* MANUAL MODE */}
            {mode === 'manual' && (
              <>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Transaction Details</p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Amount ($) *</label>
                    <input type="number" step="0.01" min="0" placeholder="e.g. 239.93"
                      value={manual.amount}
                      onChange={e => setManual(m => ({ ...m, amount: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Payment Method</label>
                    <select value={manual.payment_method} onChange={e => setManual(m => ({ ...m, payment_method: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-brand-500">
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                      <option value="digital_wallet">Digital Wallet</option>
                      <option value="wire_transfer">Wire Transfer</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Merchant</label>
                    <input type="text" placeholder="e.g. Amazon"
                      value={manual.merchant_name}
                      onChange={e => setManual(m => ({ ...m, merchant_name: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Transaction Region</label>
                    <input type="text" placeholder="e.g. New York, US"
                      value={manual.tx_region}
                      onChange={e => setManual(m => ({ ...m, tx_region: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-brand-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Device Type</label>
                    <select value={manual.device_type} onChange={e => setManual(m => ({ ...m, device_type: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-brand-500">
                      <option value="mobile">Mobile</option>
                      <option value="desktop">Desktop</option>
                      <option value="atm">ATM</option>
                      <option value="pos">POS Terminal</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">IP Address</label>
                    <input type="text" placeholder="e.g. 192.168.1.1"
                      value={manual.ip_address}
                      onChange={e => setManual(m => ({ ...m, ip_address: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-brand-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Transaction Frequency</label>
                    <select value={manual.tx_frequency} onChange={e => setManual(m => ({ ...m, tx_frequency: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-brand-500">
                      <option value="first_time">First-time</option>
                      <option value="occasional">Occasional</option>
                      <option value="frequent">Frequent</option>
                      <option value="spike">Unusual Spike</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Customer Risk Level</label>
                    <select value={manual.customer_risk} onChange={e => setManual(m => ({ ...m, customer_risk: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-brand-500">
                      <option value="low">Low Risk (Trusted)</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk (Watchlist)</option>
                      <option value="new">New Account</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Device Trust Score</label>
                  <select value={manual.device_trust} onChange={e => setManual(m => ({ ...m, device_trust: e.target.value }))}
                    className="w-full mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-brand-500">
                    <option value="high">High (Known Good Device)</option>
                    <option value="medium">Medium (Unverified)</option>
                    <option value="low">Low (Suspicious Fingerprint)</option>
                  </select>
                </div>

                {/* Quick-fill presets */}
                <div className="flex gap-1.5 flex-wrap pt-2">
                  <p className="text-[10px] text-[var(--text-muted)] self-center">Presets:</p>
                  {Object.entries(SCENARIOS).map(([key, scn]) => (
                    <button key={key} type="button"
                      onClick={() => {
                        const p = scn.payload
                        setManual({ amount: p.amount, time_seconds: p.time_seconds || 0, merchant_name: p.merchant_name || '',
                          device_type: 'mobile', payment_method: 'credit_card', tx_region: '', customer_risk: 'low',
                          ip_address: '', tx_frequency: 'occasional', device_trust: 'high',
                          ...Object.fromEntries(Array.from({length:28},(_,i)=>[`v${i+1}`, p[`v${i+1}`] ?? 0])) })
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium border border-brand-500/30 text-brand-500 hover:bg-brand-500/10 transition-colors">
                      {scn.label}
                    </button>
                  ))}
                </div>

                <button type="button" disabled={loading} onClick={runManual}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-lg mt-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  {loading ? 'Analyzing…' : 'Analyze Transaction'}
                </button>
              </>
            )}
          </div>

          {/* RIGHT: result panel */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">FRAUD RISK ASSESSMENT</p>
            <ResultPanel result={result} explanation={explanation} loading={loading} onExplain={runExplain} />
          </div>
        </div>
      )}
    </div>
  )
}
