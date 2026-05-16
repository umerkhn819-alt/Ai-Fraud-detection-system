const CELLS = [
  { label: 'TN', title: 'True Negative', subtitle: 'Correctly identified as legit', bg: 'bg-success-500/10', text: 'text-success-500', border: 'border-success-500/20' },
  { label: 'FP', title: 'False Positive', subtitle: 'Legit flagged as fraud', bg: 'bg-warning-500/10', text: 'text-warning-500', border: 'border-warning-500/20' },
  { label: 'FN', title: 'False Negative', subtitle: 'Fraud missed by model', bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  { label: 'TP', title: 'True Positive', subtitle: 'Correctly detected fraud', bg: 'bg-fraud-500/10', text: 'text-fraud-500', border: 'border-fraud-500/20' },
]

export default function ConfusionMatrix({ tp = 0, tn = 0, fp = 0, fn = 0 }) {
  const values = { TN: tn, FP: fp, FN: fn, TP: tp }
  const total = tp + tn + fp + fn

  return (
    <div>
      {/* Axis labels */}
      <div className="mb-2 grid grid-cols-[auto_1fr_1fr] items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        <span />
        <span className="text-center">Pred: Legit</span>
        <span className="text-center">Pred: Fraud</span>
      </div>

      <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
        {/* Row 1 label */}
        <div className="flex items-center justify-end pr-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] [writing-mode:vertical-rl] rotate-180">Actual Legit</span>
        </div>
        {[CELLS[0], CELLS[1]].map(cell => {
          const v = values[cell.label]
          const pct = total ? ((v / total) * 100).toFixed(1) : '0.0'
          return (
            <div key={cell.label} className={`${cell.bg} ${cell.border} border rounded-xl p-3 text-center group hover:scale-105 transition-transform`}>
              <p className={`text-xs font-bold ${cell.text}`}>{cell.label}</p>
              <p className={`text-2xl font-bold ${cell.text} mt-1`}>{v.toLocaleString()}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{pct}%</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 hidden group-hover:block">{cell.subtitle}</p>
            </div>
          )
        })}

        {/* Row 2 label */}
        <div className="flex items-center justify-end pr-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] [writing-mode:vertical-rl] rotate-180">Actual Fraud</span>
        </div>
        {[CELLS[2], CELLS[3]].map(cell => {
          const v = values[cell.label]
          const pct = total ? ((v / total) * 100).toFixed(1) : '0.0'
          return (
            <div key={cell.label} className={`${cell.bg} ${cell.border} border rounded-xl p-3 text-center group hover:scale-105 transition-transform`}>
              <p className={`text-xs font-bold ${cell.text}`}>{cell.label}</p>
              <p className={`text-2xl font-bold ${cell.text} mt-1`}>{v.toLocaleString()}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{pct}%</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 hidden group-hover:block">{cell.subtitle}</p>
            </div>
          )
        })}
      </div>

      {total > 0 && (
        <p className="mt-2 text-[10px] text-center text-[var(--text-muted)]">
          Total: {total.toLocaleString()} labeled predictions
        </p>
      )}
    </div>
  )
}
