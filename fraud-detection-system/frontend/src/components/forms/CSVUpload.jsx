import { useRef, useState } from 'react'
import { Upload, FileText, X, CheckCircle, Loader2 } from 'lucide-react'

export default function CSVUpload({ onFile, disabled }) {
  const inputRef = useRef()
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null) // { total, fraud, skipped }

  const handle = async (f) => {
    if (!f) return
    setFile(f)
    setResult(null)
    setProcessing(true)
    setProgress(0)

    // Animate progress bar
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 85) { clearInterval(interval); return p }
        return p + Math.random() * 12
      })
    }, 180)

    try {
      const res = await onFile(f)
      clearInterval(interval)
      setProgress(100)
      // Parse result if returned
      if (res && typeof res === 'object') {
        setResult(res)
      }
    } catch {
      clearInterval(interval)
    } finally {
      setTimeout(() => setProcessing(false), 600)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer?.files?.[0]
    if (f && f.name.endsWith('.csv')) handle(f)
  }

  const reset = (e) => {
    e.stopPropagation()
    setFile(null)
    setResult(null)
    setProgress(0)
    setProcessing(false)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !processing && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
          dragOver ? 'border-brand-500 bg-brand-500/5' :
          disabled || processing ? 'border-[var(--border)] opacity-70 cursor-not-allowed' :
          'border-[var(--border)] hover:border-brand-500/60 hover:bg-brand-500/5'
        }`}
      >
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all ${dragOver ? 'bg-brand-500/20' : processing ? 'bg-violet-500/10' : 'bg-[var(--bg-tertiary)]'}`}>
          {processing
            ? <Loader2 className="h-6 w-6 text-violet-500 animate-spin" />
            : <Upload className={`h-6 w-6 ${dragOver ? 'text-brand-500' : 'text-[var(--text-muted)]'}`} />
          }
        </div>

        {processing ? (
          <div className="w-full space-y-2">
            <p className="text-sm font-semibold text-violet-400 animate-pulse">Analyzing transactions...</p>
            <div className="w-full rounded-full bg-[var(--bg-tertiary)] h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-brand-500 transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">Running ML inference on each row · {Math.round(Math.min(progress, 100))}%</p>
          </div>
        ) : file ? (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm">
            <FileText className="h-4 w-4 text-brand-500" />
            <span className="font-medium text-[var(--text-primary)]">{file.name}</span>
            <button type="button" onClick={reset} className="ml-1 text-[var(--text-muted)] hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-[var(--text-secondary)]">Drop CSV here or click to browse</p>
            <p className="text-xs text-[var(--text-muted)]">Kaggle creditcard.csv format (Amount, Time, V1–V28)</p>
          </>
        )}

        <input ref={inputRef} type="file" accept=".csv" className="hidden"
          onChange={e => handle(e.target.files?.[0])} disabled={disabled || processing} />
      </div>

      {/* Result summary banner */}
      {result && !processing && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-emerald-500">
              Analyzed {(result.total ?? 0).toLocaleString()} transactions — {(result.fraud ?? 0).toLocaleString()} anomalies detected
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {result.fraud > 0
                ? `${((result.fraud / result.total) * 100).toFixed(1)}% fraud rate · ${result.skipped ?? 0} rows skipped`
                : `All transactions appear legitimate · ${result.skipped ?? 0} rows skipped`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
