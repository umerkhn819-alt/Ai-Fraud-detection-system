export function formatCurrency(n) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n ?? 0)
}

export function formatDate(s) {
  if (!s) return '—'
  const d = typeof s === 'string' ? new Date(s) : s
  return d.toLocaleString()
}

export function severityColor(s) {
  const m = { critical: 'bg-red-600', high: 'bg-orange-500', medium: 'bg-amber-400', low: 'bg-slate-400' }
  return m[s] || 'bg-slate-400'
}

export function truncate(str, n = 80) {
  if (!str) return ''
  return str.length <= n ? str : `${str.slice(0, n)}…`
}

export function cn(...xs) {
  return xs.filter(Boolean).join(' ')
}
