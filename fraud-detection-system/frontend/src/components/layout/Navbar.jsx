import { LogOut, Menu, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar({ onMenu }) {
  const { user, logout } = useAuth()
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={onMenu}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-slate-500">Fraud Detection</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 text-sm text-slate-600 sm:flex">
          <User className="h-4 w-4" />
          <span>{user?.full_name}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs capitalize">{user?.role}</span>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  )
}
