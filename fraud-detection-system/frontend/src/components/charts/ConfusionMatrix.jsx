export default function ConfusionMatrix({ tp = 0, tn = 0, fp = 0, fn = 0 }) {
  const cells = [
    { label: 'TN', v: tn, c: 'bg-emerald-100' },
    { label: 'FP', v: fp, c: 'bg-amber-100' },
    { label: 'FN', v: fn, c: 'bg-orange-100' },
    { label: 'TP', v: tp, c: 'bg-red-100' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2">
      {cells.map((x) => (
        <div key={x.label} className={`rounded-xl p-4 text-center ${x.c}`}>
          <p className="text-xs font-semibold text-slate-600">{x.label}</p>
          <p className="text-2xl font-bold text-slate-900">{x.v}</p>
        </div>
      ))}
    </div>
  )
}
