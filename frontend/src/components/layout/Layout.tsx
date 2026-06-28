import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useUIStore } from '../../store/ui.store'
import { cn } from '../../utils/cn'

interface LayoutProps {
  children: ReactNode
  title: string
  breadcrumb?: string
}

export function Layout({ children, title, breadcrumb }: LayoutProps) {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar />
      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 transition-all duration-200',
          sidebarOpen ? 'lg:ml-60' : 'lg:ml-16',
        )}
      >
        <Header title={title} breadcrumb={breadcrumb} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
