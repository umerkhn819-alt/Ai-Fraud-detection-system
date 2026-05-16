import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, Shield, User, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'analyst' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0].msg : 'Registration failed');
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const field = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-success-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-brand-600/10 blur-3xl" />
      </div>
      <div className="w-full max-w-md animate-in relative z-10">
        <div className="card p-8">
          <div className="mb-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-success-500 to-brand-500 shadow-glow-success mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Account</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Join FraudGuard AI platform</p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-fraud-500/20 bg-fraud-500/5 px-3 py-2.5 text-sm text-fraud-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={form.full_name}
                  onChange={e => field('full_name', e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="John Smith"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={e => field('email', e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={e => field('password', e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] pl-10 pr-10 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Min 8 characters"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Role</label>
              <select
                id="reg-role"
                value={form.role}
                onChange={e => field('role', e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
                <option value="risk_manager">Risk Manager</option>
              </select>
            </div>

            <button
              id="reg-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-success-500 to-brand-600 py-2.5 text-sm font-semibold text-white shadow-glow-success transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating…
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-[var(--text-muted)]">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand-500 hover:text-brand-400 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
