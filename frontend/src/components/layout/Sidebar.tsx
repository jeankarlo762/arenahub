import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  MapPin,
  CalendarDays,
  Trophy,
  Settings,
  DollarSign,
  LogOut,
  Menu,
  Beer,
  ClipboardList,
  Users,
  CalendarRange,
  BarChart2,
  Link,
  ScrollText,
  Moon,
  Sun,
  LifeBuoy,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAuthStore } from '../../store/auth.store'
import { useUIStore } from '../../store/ui.store'
import { useBrandingStore } from '../../store/branding.store'
import { MTLogo } from '../ui/MTLogo'
import * as authApi from '../../api/auth.api'
import toast from 'react-hot-toast'

const commonItems = [
  { to: '/courts',      icon: MapPin,          label: 'Quadras',         module: 'courts' },
  { to: '/bookings',    icon: CalendarDays,    label: 'Agendamentos',    module: 'bookings' },
  { to: '/tournaments', icon: Trophy,          label: 'Torneios',        module: 'tournaments' },
  { to: '/clients',     icon: Users,           label: 'Clientes',        module: 'clients' },
  { to: '/rentals',     icon: CalendarRange,   label: 'Locação',         module: 'rentals' },
  { to: '/comandas',    icon: ClipboardList,   label: 'Comandas',        module: 'comandas' },
]

const adminItems = [
  { to: '/bar',          icon: Beer,           label: 'Bar',             module: 'bar' },
  { to: '/financial',    icon: DollarSign,     label: 'Financeiro',      module: 'financial' },
  { to: '/reports',      icon: BarChart2,      label: 'Relatórios',      module: 'reports' },
  { to: '/auto-booking', icon: Link,           label: 'Agendamento Auto.', module: 'auto_booking' },
  { to: '/audit',        icon: ScrollText,     label: 'Auditoria',       module: 'audit' },
  { to: '/settings',     icon: Settings,       label: 'Configurações',   module: 'settings' },
]

export function Sidebar() {
  const { user, refreshToken, clearAuth, hasModule } = useAuthStore()
  const { sidebarOpen, toggleSidebar, darkMode, toggleDarkMode } = useUIStore()
  const { logoUrl } = useBrandingStore()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'ADMIN'

  const visibleCommon = commonItems.filter((item) => hasModule(item.module))
  const visibleAdmin  = isAdmin ? adminItems.filter((item) => hasModule(item.module)) : []

  async function handleLogout() {
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      // ignore
    }
    clearAuth()
    navigate('/login')
    toast.success('Sessão encerrada')
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-screen z-30 flex flex-col bg-gray-900 text-white transition-all duration-200 overflow-hidden',
          sidebarOpen ? 'w-60' : 'w-0 overflow-hidden lg:w-16',
        )}
      >
        <div className="flex items-center gap-3 px-4 h-20 border-b border-gray-700 shrink-0">
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg hover:bg-gray-700 transition-colors lg:flex hidden shrink-0"
          >
            <Menu size={20} />
          </button>
          {sidebarOpen && (
            logoUrl
              ? <img src={logoUrl} alt="Logo" className="h-12 max-w-[148px] object-contain" />
              : <MTLogo size="lg" />
          )}
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-0.5 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          {/* Dashboard — sempre visível */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white',
              )
            }
          >
            <LayoutDashboard size={18} className="shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </NavLink>

          {visibleCommon.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}

          {visibleAdmin.length > 0 && (
            <>
              <div className="my-3 mx-4 border-t border-gray-700/70" />
              {sidebarOpen && (
                <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Administração
                </p>
              )}
              {visibleAdmin.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                    )
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {sidebarOpen && <span>{label}</span>}
                </NavLink>
              ))}
            </>
          )}
          {/* Suporte — sempre visível */}
          <div className="my-3 mx-4 border-t border-gray-700/70" />
          <NavLink
            to="/suporte"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white',
              )
            }
          >
            <LifeBuoy size={18} className="shrink-0" />
            {sidebarOpen && <span>Suporte</span>}
          </NavLink>
        </nav>

        <div className="border-t border-gray-700 p-4 shrink-0">
          {sidebarOpen && user && (
            <div className="mb-3">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role === 'ADMIN' ? 'Administrador' : 'Operador'}</p>
            </div>
          )}
          <button
            onClick={toggleDarkMode}
            title={darkMode ? 'Desativar modo escuro' : 'Ativar modo escuro'}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors mb-1"
          >
            {darkMode
              ? <Sun size={18} className="shrink-0 text-yellow-400" />
              : <Moon size={18} className="shrink-0" />
            }
            {sidebarOpen && (
              <span>{darkMode ? 'Modo claro' : 'Modo escuro'}</span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
