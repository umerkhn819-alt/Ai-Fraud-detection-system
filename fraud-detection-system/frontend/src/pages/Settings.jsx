import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import * as auth from '../services/authService'

export default function Settings() {
  const { user, refresh } = useAuth()
  const [name, setName] = useState(user?.full_name || '')
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (user?.full_name) setName(user.full_name)
  }, [user])

  const { data: pub } = useQuery({
    queryKey: ['public-config'],
    queryFn: () => api.get('/config/public').then((r) => r.data),
  })

  const saveProfile = async (e) => {
    e.preventDefault()
    setMsg('')
    try {
      await auth.updateProfile(name)
      await refresh()
      setMsg('Profile updated')
    } catch (ex) {
      setMsg(ex.response?.data?.detail || 'Update failed')
    }
  }

  const savePw = async (e) => {
    e.preventDefault()
    setMsg('')
    try {
      await auth.changePassword(curPw, newPw)
      setCurPw('')
      setNewPw('')
      setMsg('Password changed')
    } catch (ex) {
      setMsg(ex.response?.data?.detail || 'Password change failed')
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">{user?.email}</p>
      </div>

      {msg && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm">{String(msg)}</p>}

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800">Model threshold (read-only)</h2>
        <p className="mt-2 text-sm text-slate-600">
          Current server threshold: <strong>{pub?.fraud_threshold ?? '…'}</strong> — set <code className="rounded bg-slate-100 px-1">FRAUD_THRESHOLD</code> in backend <code className="rounded bg-slate-100 px-1">.env</code>.
        </p>
        <p className="mt-1 text-xs text-slate-400">API {pub?.api_version}</p>
      </div>

      <form onSubmit={saveProfile} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-800">Profile</h2>
        <div>
          <label className="text-sm font-medium text-slate-700">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
          Save profile
        </button>
      </form>

      <form onSubmit={savePw} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-800">Change password</h2>
        <input
          type="password"
          placeholder="Current password"
          value={curPw}
          onChange={(e) => setCurPw(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
        />
        <input
          type="password"
          placeholder="New password (min 8)"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
        />
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Update password
        </button>
      </form>
    </div>
  )
}
