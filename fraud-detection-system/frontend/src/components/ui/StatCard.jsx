import { cn } from '../../utils/helpers'

export default function StatCard({ title, value, subtitle, borderClass = 'border-l-brand-500' }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-100 bg-white p-5 shadow-sm',
        'border-l-4',
        borderClass
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  )
}
