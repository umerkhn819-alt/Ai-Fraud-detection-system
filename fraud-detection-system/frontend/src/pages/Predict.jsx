import { useState } from 'react'
import * as txSvc from '../services/transactionService'
import * as predSvc from '../services/predictionService'
import TransactionForm from '../components/forms/TransactionForm'
import CSVUpload from '../components/forms/CSVUpload'
import RiskScoreBar from '../components/charts/RiskScoreBar'
import Badge from '../components/ui/Badge'

export default function Predict() {
  const [mode, setMode] = useState('manual')
  const [form, setForm] = useState({
    amount: '',
    time_seconds: '0',
    merchant_name: '',
    card_last4: '',
    location_city: '',
  })
  const [result, setResult] = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const runManual = async () => {
    setLoading(true)
    setResult(null)
    setExplanation(null)
    setMsg('')
    try {
      const body = {
        amount: parseFloat(form.amount),
        time_seconds: parseFloat(form.time_seconds || 0),
        merchant_name: form.merchant_name || undefined,
        card_last4: form.card_last4 || undefined,
        location_city: form.location_city || undefined,
      }
      const txn = await txSvc.createTransaction(body)
      const pred = await predSvc.runPrediction(txn.id)
      setResult(pred)
    } catch (e) {
      setMsg(e.response?.data?.detail || e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  const runExplain = async () => {
    if (!result) return
    setLoading(true)
    try {
      const r = await predSvc.explainPrediction(result.id)
      setExplanation(r.explanation)
    } catch (e) {
      setMsg(e.response?.data?.detail || 'Explain failed')
    } finally {
      setLoading(false)
    }
  }

  const onCsv = async (file) => {
    setLoading(true)
    setMsg('')
    try {
      const r = await txSvc.uploadCsv(file)
      setMsg(r.message + (r.skipped ? ` (${r.skipped} skipped)` : ''))
    } catch (e) {
      setMsg(e.response?.data?.detail || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Fraud prediction</h1>

      <div className="flex gap-2">
        {['manual', 'csv'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              mode === m ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {m === 'manual' ? 'Manual entry' : 'Upload CSV'}
          </button>
        ))}
      </div>

      {msg && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{String(msg)}</p>}

      {mode === 'manual' ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <TransactionForm form={form} setForm={setForm} onSubmit={runManual} loading={loading} />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <CSVUpload disabled={loading} onFile={onCsv} />
        </div>
      )}

      {result && (
        <div
          className={`rounded-2xl border p-6 shadow-sm ${
            result.is_fraud ? 'border-red-200 bg-red-50/80' : 'border-emerald-200 bg-emerald-50/80'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">{result.is_fraud ? 'Fraud suspected' : 'Appears legitimate'}</h2>
            <Badge variant={result.is_fraud ? 'danger' : 'success'}>{(result.severity || 'n/a').toUpperCase()}</Badge>
          </div>
          <RiskScoreBar probability={result.fraud_probability} />
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Probability</p>
              <p className="text-xl font-semibold">{(result.fraud_probability * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-slate-500">Confidence</p>
              <p className="text-xl font-semibold">
                {result.confidence_score != null ? `${(result.confidence_score * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={runExplain}
            className="mt-4 w-full rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'AI explanation'}
          </button>
        </div>
      )}

      {explanation && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6">
          <h3 className="font-semibold text-violet-900">AI analysis</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{explanation}</p>
        </div>
      )}
    </div>
  )
}
