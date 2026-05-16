export default function LoadingSkeleton({ rows = 3, type = 'card' }) {
  if (type === 'table') {
    return (
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-xl p-3">
            <div className="shimmer h-4 w-24 rounded-lg" />
            <div className="shimmer h-4 flex-1 rounded-lg" />
            <div className="shimmer h-4 w-16 rounded-lg" />
            <div className="shimmer h-4 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  if (type === 'stat') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="shimmer h-3 w-24 rounded" />
                <div className="shimmer h-7 w-16 rounded" />
                <div className="shimmer h-3 w-20 rounded" />
              </div>
              <div className="shimmer h-11 w-11 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'chart') {
    return (
      <div className="card p-5">
        <div className="shimmer h-4 w-32 rounded mb-4" />
        <div className="shimmer h-48 w-full rounded-xl" />
      </div>
    )
  }

  // Default: card rows
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="shimmer h-4 w-1/3 rounded" />
          <div className="shimmer h-3 w-2/3 rounded" />
          <div className="shimmer h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )
}
