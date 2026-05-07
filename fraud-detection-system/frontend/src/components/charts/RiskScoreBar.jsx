export default function RiskScoreBar({ probability }) {
  const pct = Math.min(100, Math.max(0, (probability ?? 0) * 100))
  return (
    <div className="mt-2">
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">{pct.toFixed(1)}% risk score</p>
    </div>
  )
}
