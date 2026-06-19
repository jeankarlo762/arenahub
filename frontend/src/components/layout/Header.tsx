import { Menu } from 'lucide-react'
import { useUIStore } from '../../store/ui.store'
import { NotificationBell } from '../ui/NotificationBell'

interface HeaderProps {
  title: string
  breadcrumb?: string
}

export function Header({ title, breadcrumb }: HeaderProps) {
  const { toggleSidebar } = useUIStore()

  return (
    <header className="h-16 flex items-center gap-4 px-6 bg-white border-b border-gray-200 shrink-0">
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors lg:hidden"
      >
        <Menu size={20} />
      </button>
      <div>
        {breadcrumb && <p className="text-xs text-gray-400">{breadcrumb}</p>}
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>
      <div className="ml-auto">
        <NotificationBell />
      </div>
    </header>
  )
}
