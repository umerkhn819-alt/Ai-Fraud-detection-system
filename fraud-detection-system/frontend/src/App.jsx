import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/layout/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Predict from './pages/Predict'
import History from './pages/History'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Cases from './pages/Cases'
import Monitoring from './pages/Monitoring'
import Alerts from './pages/Alerts'
import Rules from './pages/Rules'
import Entities from './pages/Entities'
import ModelMonitoring from './pages/ModelMonitoring'
import Audit from './pages/Audit'
import Reports from './pages/Reports'
import SimulationLab from './pages/SimulationLab'

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Loading FraudGuard AI…</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RoleRoute({ roles, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Landing />} />
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="predict" element={<Predict />} />
                <Route path="history" element={<History />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="settings" element={<Settings />} />
                <Route path="cases" element={<Cases />} />
                <Route path="monitoring" element={<Monitoring />} />
                <Route path="alerts" element={<Alerts />} />
                <Route
                  path="rules"
                  element={
                    <RoleRoute roles={['admin', 'analyst']}>
                      <Rules />
                    </RoleRoute>
                  }
                />
                <Route path="entities" element={<Entities />} />
                <Route path="model-monitoring" element={<ModelMonitoring />} />
                <Route
                  path="audit"
                  element={
                    <RoleRoute roles={['admin']}>
                      <Audit />
                    </RoleRoute>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <RoleRoute roles={['admin']}>
                      <Reports />
                    </RoleRoute>
                  }
                />
                <Route
                  path="simulation"
                  element={
                    <RoleRoute roles={['admin']}>
                      <SimulationLab />
                    </RoleRoute>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
