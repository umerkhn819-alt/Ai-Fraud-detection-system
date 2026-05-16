import { NavLink } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileText,
  GitBranch,
  History,
  LayoutDashboard,
  Network,
  Scale,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Shield,
  FlaskConical,
} from 'lucide-react'
import { cn } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'

const NAV_GROUPS = [
  {
    label: 'Core',
    links: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/predict', icon: ShieldAlert, label: 'Detection Lab' },
      { to: '/history', icon: History, label: 'Transaction History' },
      { to: '/cases', icon: ShieldCheck, label: 'Investigations' },
    ],
  },
  {
    label: 'Intelligence',
    links: [
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/monitoring', icon: Activity, label: 'Monitoring' },
      { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
      { to: '/entities', icon: Network, label: 'Risk Entities' },
      { to: '/model-monitoring', icon: GitBranch, label: 'Model Monitor' },
    ],
  },
  {
    label: 'Admin',
    adminOnly: false,
    links: [
      { to: '/rules', icon: Scale, label: 'Detection Rules', roles: ['admin', 'analyst'] },
      { to: '/simulation', icon: FlaskConical, label: 'Attack Simulation', roles: ['admin'] },
      { to: '/audit', icon: FileText, label: 'Audit Log', roles: ['admin'] },
      { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['admin'] },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth()

  const isVisible = (link) => !link.roles || (user && link.roles.includes(user.role))

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 flex flex-col',
          'border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]',
          'transition-transform duration-300 ease-in-out',
          'lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-3 px-5 border-b border-[var(--border)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-glow-brand">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-[var(--text-primary)]">FraudGuard</p>
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Fraud Intelligence Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV_GROUPS.map((group) => {
            const visibleLinks = group.links.filter(isVisible)
            if (visibleLinks.length === 0) return null
            return (
              <div key={group.label}>
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleLinks.map(({ to, icon: Icon, label, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                          isActive
                            ? 'bg-brand-500/10 text-brand-500 dark:bg-brand-500/20 dark:text-brand-400 border-glow-brand'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-500 dark:text-brand-400' : '')} />
                          <span>{label}</span>
                          {isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-brand-400" />
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User footer */}
        {user && (
          <div className="shrink-0 border-t border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-xs font-bold text-white">
                {user.full_name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{user.full_name}</p>
                <p className="text-[10px] capitalize text-[var(--text-muted)]">{user.role}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
