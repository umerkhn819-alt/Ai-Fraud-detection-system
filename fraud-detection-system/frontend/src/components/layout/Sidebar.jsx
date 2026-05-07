import { NavLink } from 'react-router-dom'
import { BarChart3, History, LayoutDashboard, Settings, ShieldAlert } from 'lucide-react'
import { cn } from '../../utils/helpers'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/predict', icon: ShieldAlert, label: 'Predict' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-56 transform border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center border-b border-slate-200 px-4 font-semibold text-brand-600">
          Guardrails
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-brand-500 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
