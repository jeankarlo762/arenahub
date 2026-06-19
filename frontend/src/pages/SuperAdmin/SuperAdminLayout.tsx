import { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, UsersRound, DollarSign, ScrollText, KeyRound, LogOut } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAuthStore } from '../../store/auth.store'

const navItems = [
  { to: '/superadmin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/superadmin/tenants', icon: Building2, label: 'Tenants', end: false },
  { to: '/superadmin/usuarios', icon: UsersRound, label: 'Usuários Tenants', end: false },
  { to: '/superadmin/financeiro', icon: DollarSign, label: 'Financeiro', end: false },
  { to: '/superadmin/auditoria', icon: ScrollText, label: 'Auditoria', end: false },
  { to: '/superadmin/seguranca', icon: KeyRound, label: 'Segurança', end: false },
]

export function SuperAdminLayout({ children, title, subtitle, action }: {
  children: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col fixed h-full">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-700 shrink-0">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight leading-none">ArenaHub</span>
            <span className="text-[10px] text-orange-400 font-medium mt-0.5">Super Admin</span>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-700 p-4 shrink-0">
          {user && (
            <div className="mb-3">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 ml-60">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
            {action}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
