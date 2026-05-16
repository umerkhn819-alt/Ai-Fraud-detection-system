import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-float text-xs">
      <p className="mb-2 font-semibold text-[var(--text-primary)]">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--text-secondary)] capitalize">{p.dataKey}:</span>
          <span className="font-semibold text-[var(--text-primary)]">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function FraudLineChart({ data = [] }) {
  // Calculate a dynamic width to allow for natural touchpad scrolling.
  // 40px per data point ensures the graph isn't squished when there's lots of data.
  const dynamicWidth = data.length > 20 ? data.length * 40 : '100%'

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent">
      <div style={{ width: dynamicWidth, minWidth: '100%' }}>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#totalGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6' }}
            />
            <Area
              type="monotone"
              dataKey="fraud"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#fraudGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#ef4444' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
