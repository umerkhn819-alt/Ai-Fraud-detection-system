import { Bell, LogOut, Menu, Moon, Sun, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

export default function Navbar({ onMenu }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const { data: alerts } = useQuery({
    queryKey: ['alerts-unread-count'],
    queryFn: async () => {
      const res = await api.get('/alerts/')
      return (res.data || []).filter(a => !a.acknowledged).length
    },
    refetchInterval: 30000,
  })

  const unreadCount = alerts || 0

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] px-4 bg-[var(--navbar-bg)] backdrop-blur-md">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          id="sidebar-toggle-btn"
          className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors lg:hidden"
          onClick={onMenu}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-xs text-[var(--text-muted)]">Welcome back,</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.full_name ?? 'User'}</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <button
          id="theme-toggle-btn"
          type="button"
          onClick={toggleTheme}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all duration-200"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Alerts bell */}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all duration-200"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fraud-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-fraud-500" />
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="mx-1.5 h-6 w-px bg-[var(--border)]" />

        {/* Role badge */}
        <span className="hidden sm:inline-flex items-center rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--text-secondary)]">
          {user?.role}
        </span>

        {/* Logout */}
        <button
          id="logout-btn"
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-fraud-500 hover:text-fraud-500 transition-all duration-200"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
