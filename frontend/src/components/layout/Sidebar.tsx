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
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAuthStore } from '../../store/auth.store'
import { useUIStore } from '../../store/ui.store'
import * as authApi from '../../api/auth.api'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/courts', icon: MapPin, label: 'Quadras' },
  { to: '/bookings', icon: CalendarDays, label: 'Agendamentos' },
  { to: '/tournaments', icon: Trophy, label: 'Torneios' },
  { to: '/bar', icon: Beer, label: 'Bar', adminOnly: true },
  { to: '/comandas', icon: ClipboardList, label: 'Comandas', adminOnly: true },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/rentals', icon: CalendarRange, label: 'Locação' },
  { to: '/financial', icon: DollarSign, label: 'Financeiro', adminOnly: true },
  { to: '/reports', icon: BarChart2, label: 'Relatórios', adminOnly: true },
  { to: '/auto-booking', icon: Link, label: 'Agendamento Auto.', adminOnly: true },
  { to: '/settings', icon: Settings, label: 'Configurações', adminOnly: true },
]

export function Sidebar() {
  const { user, refreshToken, clearAuth } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'ADMIN'
  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin)

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
          'fixed top-0 left-0 h-full z-30 flex flex-col bg-gray-900 text-white transition-all duration-200',
          sidebarOpen ? 'w-60' : 'w-0 overflow-hidden lg:w-16',
        )}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-700 shrink-0">
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg hover:bg-gray-700 transition-colors lg:flex hidden"
          >
            <Menu size={20} />
          </button>
          {sidebarOpen && (
            <span className="font-bold text-lg tracking-tight">ArenaHub</span>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
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
