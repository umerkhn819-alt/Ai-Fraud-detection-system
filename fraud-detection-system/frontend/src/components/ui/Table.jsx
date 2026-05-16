import { cn } from '../../utils/helpers'

export default function Table({ columns, data, emptyMessage = 'No data available', onRowClick }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)]">
          <svg className="h-7 w-7 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[var(--text-secondary)]">{emptyMessage}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Data will appear here once available</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {data.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'transition-colors',
                onRowClick ? 'cursor-pointer hover:bg-brand-500/5' : ''
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className="py-3 pr-4 text-[var(--text-secondary)]">
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
