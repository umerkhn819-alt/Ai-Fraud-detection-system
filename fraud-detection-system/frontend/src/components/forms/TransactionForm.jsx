import { DollarSign, MapPin, CreditCard, Clock, ShieldAlert } from 'lucide-react'

const fields = [
  { key: 'amount', label: 'Amount (USD)', type: 'number', placeholder: '250.00', icon: DollarSign, required: true },
  { key: 'time_seconds', label: 'Time (seconds since day start)', type: 'number', placeholder: '0', icon: Clock },
  { key: 'merchant_name', label: 'Merchant Name', type: 'text', placeholder: 'Amazon', icon: ShieldAlert },
  { key: 'card_last4', label: 'Card Last 4 Digits', type: 'text', placeholder: '4242', icon: CreditCard, maxLength: 4 },
  { key: 'location_city', label: 'City', type: 'text', placeholder: 'Karachi', icon: MapPin },
]

export default function TransactionForm({ form, setForm, onSubmit, loading }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ key, label, type, placeholder, icon: Icon, required, maxLength }) => (
          <div key={key} className={key === 'amount' ? 'sm:col-span-2' : ''}>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              {label}{required && <span className="ml-0.5 text-fraud-500">*</span>}
            </label>
            <div className="relative">
              {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />}
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                required={required}
                maxLength={maxLength}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[var(--text-muted)]">
        V1–V28 PCA features default to 0.0. Upload a Kaggle CSV for real feature vectors.
      </p>

      <button
        id="predict-manual-btn"
        type="button"
        disabled={loading || !form.amount}
        onClick={onSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fraud-500 to-fraud-700 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-fraud transition-all"
      >
        {loading ? (
          <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Analyzing…</>
        ) : (
          <><ShieldAlert className="h-4 w-4" />Run Fraud Detection</>
        )}
      </button>
    </div>
  )
}
