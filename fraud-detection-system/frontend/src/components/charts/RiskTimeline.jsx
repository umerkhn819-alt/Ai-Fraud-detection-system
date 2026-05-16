import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { useMemo } from 'react'

function generateTimeline() {
  const now = new Date()
  const data = []
  for (let i = 23; i >= 0; i--) {
    const h = new Date(now - i * 3600000)
    const hour = h.getHours()
    // Simulate realistic risk curve: lower at night, spikes during business hours
    const base = hour >= 9 && hour <= 17 ? 18 + Math.random() * 25 : 4 + Math.random() * 12
    const spike = (hour === 14 || hour === 2) ? base + 35 + Math.random() * 20 : base
    data.push({
      time: `${String(hour).padStart(2, '0')}:00`,
      risk: Math.round(Math.min(spike, 95)),
      anomaly: spike > base + 20 ? Math.round(spike) : null,
    })
  }
  return data
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const risk = payload[0]?.value
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-float text-xs">
      <p className="font-semibold text-[var(--text-primary)] mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-violet-500" />
        <span className="text-[var(--text-secondary)]">Risk Score:</span>
        <span className={`font-bold ${risk > 60 ? 'text-red-500' : risk > 35 ? 'text-amber-500' : 'text-emerald-500'}`}>{risk}</span>
      </div>
    </div>
  )
}

export default function RiskTimeline() {
  const data = useMemo(() => generateTimeline(), [])
  const maxRisk = Math.max(...data.map(d => d.risk))
  const spikeTimes = data.filter(d => d.anomaly).map(d => d.time)

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      {spikeTimes.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <p className="text-[10px] text-red-500 font-semibold">
            {spikeTimes.length} anomaly spike{spikeTimes.length > 1 ? 's' : ''} detected — {spikeTimes.join(', ')}
          </p>
        </div>
      )}
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              interval={5}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            {spikeTimes.map(t => (
              <ReferenceLine
                key={t}
                x={t}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
            ))}
            <Area
              type="monotone"
              dataKey="risk"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#riskGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
