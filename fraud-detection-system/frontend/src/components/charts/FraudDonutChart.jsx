import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#10b981', '#ef4444']

export default function FraudDonutChart({ legit, fraud }) {
  const data = [
    { name: 'Legitimate', value: Math.max(0, legit) },
    { name: 'Fraud', value: Math.max(0, fraud) },
  ]
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={68} outerRadius={96} paddingAngle={2} dataKey="value" label>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}
