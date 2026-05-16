import { cn } from '../../utils/helpers'

const variants = {
  fraud: 'bg-fraud-500/10 text-fraud-500 border border-fraud-500/20 animate-pulse-glow',
  critical: 'bg-fraud-700/10 text-fraud-600 border border-fraud-700/20',
  high: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
  medium: 'bg-warning-500/10 text-warning-500 border border-warning-500/20',
  low: 'bg-success-500/10 text-success-500 border border-success-500/20',
  default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border)]',
  brand: 'bg-brand-500/10 text-brand-500 border border-brand-500/20',
  success: 'bg-success-500/10 text-success-500 border border-success-500/20',
}

export default function Badge({ label, variant = 'default', className }) {
  const cls = variants[variant] || variants.default
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      cls,
      className
    )}>
      {variant === 'fraud' || variant === 'critical' ? (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      ) : null}
      {label}
    </span>
  )
}
