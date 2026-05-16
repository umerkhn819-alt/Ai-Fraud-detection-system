import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const FRAUD_TYPES = [
  { name: 'Account Takeover', value: 31, color: '#ef4444' },
  { name: 'Card-Not-Present', value: 27, color: '#f97316' },
  { name: 'Phishing / Bot',   value: 19, color: '#f59e0b' },
  { name: 'Identity Theft',   value: 14, color: '#8b5cf6' },
  { name: 'Insider Threat',   value:  9, color: '#6366f1' },
]

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-float text-xs">
      <p className="font-semibold text-[var(--text-primary)] mb-1">{d.name}</p>
      <p style={{ color: d.payload.color }} className="font-bold text-base">{d.value}%</p>
      <p className="text-[var(--text-muted)]">of flagged transactions</p>
    </div>
  )
}

export default function FraudTypesPieChart({ fraudCount = 0 }) {
  const data = FRAUD_TYPES

  return (
    <div className="flex flex-col items-center justify-center gap-6 flex-1 w-full h-full min-h-[220px]">
      {/* Donut chart */}
      <div className="flex-shrink-0" style={{ width: 220, height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.color}
                  stroke="transparent"
                  style={{ filter: `drop-shadow(0 0 5px ${entry.color}60)` }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend below the chart */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 w-full px-4">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">{entry.name}</span>
            <span className="text-xs font-bold ml-1" style={{ color: entry.color }}>{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
