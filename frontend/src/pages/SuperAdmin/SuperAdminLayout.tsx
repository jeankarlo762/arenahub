import { ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, UsersRound, DollarSign, ScrollText, KeyRound, LifeBuoy, Mail, LogOut, Menu, X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAuthStore } from '../../store/auth.store'

const navItems = [
  { to: '/superadmin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/superadmin/tenants', icon: Building2, label: 'Tenants', end: false },
  { to: '/superadmin/usuarios', icon: UsersRound, label: 'Usuários Tenants', end: false },
  { to: '/superadmin/financeiro', icon: DollarSign, label: 'Financeiro', end: false },
  { to: '/superadmin/auditoria', icon: ScrollText, label: 'Auditoria', end: false },
  { to: '/superadmin/seguranca', icon: KeyRound, label: 'Segurança', end: false },
  { to: '/superadmin/email', icon: Mail, label: 'E-mail', end: false },
  { to: '/superadmin/suporte', icon: LifeBuoy, label: 'Suporte', end: false },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div className="flex items-center justify-between px-5 h-16 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
            <span className="font-black italic text-sm text-white leading-none" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>MK</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight leading-none">ArenaHub</span>
            <span className="text-[10px] text-orange-400 font-medium mt-0.5">Super Admin</span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-700 transition-colors lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
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
    </>
  )
}

export function SuperAdminLayout({ children, title, subtitle, action }: {
  children: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-gray-900 text-white flex-col fixed h-full z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-gray-900 text-white flex flex-col z-50 transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Content */}
      <main className="flex-1 lg:ml-60 min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 bg-gray-900 text-white sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
              <span className="font-black italic text-[10px] text-white leading-none" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>MK</span>
            </div>
            <span className="font-bold text-sm">ArenaHub</span>
            <span className="text-[10px] text-orange-400 font-medium">Super Admin</span>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 lg:mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
