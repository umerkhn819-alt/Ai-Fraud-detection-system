export default function TransactionForm({ form, setForm, onSubmit, loading }) {
  const fields = [
    { key: 'amount', label: 'Amount ($)', type: 'number', step: '0.01' },
    { key: 'time_seconds', label: 'Time (sec, optional)', type: 'number', step: '1' },
    { key: 'merchant_name', label: 'Merchant', type: 'text' },
    { key: 'card_last4', label: 'Card last 4', type: 'text' },
    { key: 'location_city', label: 'City', type: 'text' },
  ]
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      {fields.map(({ key, label, type, step }) => (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
          <input
            type={type}
            step={step}
            value={form[key] ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      ))}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
      >
        {loading ? 'Running…' : 'Create transaction & score'}
      </button>
    </form>
  )
}
