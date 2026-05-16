import { useEffect, useRef, useState } from 'react'
import { cn } from '../../utils/helpers'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target && target !== 0) return
    const num = parseFloat(target)
    if (isNaN(num)) return
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(num * ease)
      if (progress < 1) requestAnimationFrame(tick)
      else setValue(num)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,         // 'up' | 'down' | 'neutral'
  trendValue,   // e.g. '+12%'
  accentClass = 'from-brand-500 to-violet-500',
  glowClass = 'glow-brand',
  format,       // function to format the animated value
  rawValue,     // pass numeric value for count-up; if missing, renders value directly
}) {
  const animated = useCountUp(rawValue)
  const display = rawValue !== undefined
    ? (format ? format(animated) : Math.round(animated).toLocaleString())
    : value

  return (
    <div className={cn('card card-hover hover-lift p-5 animate-in')}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{title}</p>
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] tabular-nums">{display}</p>
          {subtitle && <p className="mt-1 text-xs text-[var(--text-muted)] truncate">{subtitle}</p>}
          {trend && (
            <div className={cn(
              'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              trend === 'up' ? 'bg-success-500/10 text-success-500' :
              trend === 'down' ? 'bg-fraud-500/10 text-fraud-500' :
              'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
            )}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> :
               trend === 'down' ? <TrendingDown className="h-3 w-3" /> :
               <Minus className="h-3 w-3" />}
              {trendValue}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg',
            accentClass
          )}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
      </div>
      {/* Bottom gradient line */}
      <div className={cn('mt-4 h-0.5 rounded-full bg-gradient-to-r opacity-40', accentClass)} />
    </div>
  )
}
