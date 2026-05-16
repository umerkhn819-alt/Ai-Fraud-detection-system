import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Moon, Sun, User, Lock, Shield, Info } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import * as auth from '../services/authService'
import APIKeys from '../components/APIKeys'

function InputField({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
    </div>
  )
}

export default function Settings() {
  const { user, refresh } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [name, setName] = useState(user?.full_name || '')
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [msg, setMsg] = useState({ text: '', ok: true })

  useEffect(() => { if (user?.full_name) setName(user.full_name) }, [user])

  const { data: pub } = useQuery({
    queryKey: ['public-config'],
    queryFn: () => api.get('/config/public').then(r => r.data),
  })

  const toast = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg({ text: '', ok: true }), 3000) }

  const saveProfile = async (e) => {
    e.preventDefault()
    try { await auth.updateProfile(name); await refresh(); toast('Profile updated successfully') }
    catch (ex) { toast(ex.response?.data?.detail || 'Update failed', false) }
  }

  const savePw = async (e) => {
    e.preventDefault()
    try { await auth.changePassword(curPw, newPw); setCurPw(''); setNewPw(''); toast('Password changed') }
    catch (ex) { toast(ex.response?.data?.detail || 'Password change failed', false) }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">{user?.email} · {user?.role}</p>
      </div>

      {msg.text && (
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
          msg.ok ? 'border-success-500/20 bg-success-500/5 text-success-500' : 'border-fraud-500/20 bg-fraud-500/5 text-fraud-500'
        }`}>
          <Info className="h-4 w-4 shrink-0" />{msg.text}
        </div>
      )}

      {/* Theme */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Appearance</h2>
            <p className="text-xs text-[var(--text-muted)]">Currently: {theme} mode</p>
          </div>
          <button id="settings-theme-toggle" type="button" onClick={toggleTheme}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-brand-500 hover:text-brand-500 transition-all">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </div>
      </div>

      {/* Model Info */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Model Configuration</h2>
        </div>
        <div className="grid gap-2 text-xs">
          <div className="flex justify-between rounded-lg border border-[var(--border)] px-3 py-2">
            <span className="text-[var(--text-muted)]">Active Threshold</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">{pub?.fraud_threshold ?? '—'}</span>
          </div>
          <div className="flex justify-between rounded-lg border border-[var(--border)] px-3 py-2">
            <span className="text-[var(--text-muted)]">AI Model</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">{pub?.openai_model ?? '—'}</span>
          </div>
          <div className="flex justify-between rounded-lg border border-[var(--border)] px-3 py-2">
            <span className="text-[var(--text-muted)]">API Version</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">{pub?.api_version ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Profile */}
      <form onSubmit={saveProfile} className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Profile</h2>
        </div>
        <InputField label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
        <button type="submit"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all">
          Save Profile
        </button>
      </form>

      {/* Password */}
      <form onSubmit={savePw} className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="h-4 w-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Change Password</h2>
        </div>
        <InputField label="Current Password" type="password" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="••••••••" />
        <InputField label="New Password" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 characters" />
        <button type="submit"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all">
          Update Password
        </button>
      </form>

      {/* API Keys */}
      <APIKeys />
    </div>
  )
}
