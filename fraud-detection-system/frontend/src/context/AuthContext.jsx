import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: restore session from localStorage token
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    // The request interceptor in api.js will pick up the token from localStorage automatically
    api.get('/auth/me')
      .then(r => setUser(r.data))
      .catch(() => {
        localStorage.removeItem('token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])  // once on mount

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    // Save token to localStorage — the interceptor picks it up on next request
    localStorage.setItem('token', data.access_token)
    setUser(data.user)
    return data
  }

  const register = async (userData) => {
    // 1. Create the account
    await api.post('/auth/register', userData)
    // 2. Automatically log them in after successful registration
    return login(userData.email, userData.password)
  }

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const r = await api.get('/auth/me')
      setUser(r.data)
    } catch {
      localStorage.removeItem('token')
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
