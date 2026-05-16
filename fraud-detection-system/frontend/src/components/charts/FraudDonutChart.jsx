import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#10b981', '#ef4444']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-float text-xs">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: d.payload.color }} />
        <span className="font-semibold text-[var(--text-primary)]">{d.name}: {d.value.toLocaleString()}</span>
      </div>
    </div>
  )
}

const RADIAN = Math.PI / 180
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.02) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

export default function FraudDonutChart({ legit = 0, fraud = 0 }) {
  const total = legit + fraud
  const data = [
    { name: 'Legitimate', value: Math.max(0, legit), color: '#10b981' },
    { name: 'Fraud', value: Math.max(0, fraud), color: '#ef4444' },
  ]
  const fraudPct = total ? ((fraud / total) * 100).toFixed(2) : '0.00'

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={renderLabel}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                style={entry.name === 'Fraud' && fraud > 0 ? { filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.5))' } : {}}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold text-fraud-500">{fraudPct}%</p>
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Fraud Rate</p>
      </div>
      {/* Legend */}
      <div className="mt-2 flex justify-center gap-4 text-xs">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-[var(--text-secondary)]">{d.name}: {d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
