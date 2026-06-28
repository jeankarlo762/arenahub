import { useState } from 'react'
import { MapPin, DollarSign, Users } from 'lucide-react'
import { Layout } from '../../components/layout/Layout'
import { UsersTab } from './UsersTab'
import { CourtsConfigTab } from './CourtsConfigTab'
import { CourtsManageSection } from './CourtsManageSection'
import { PaymentFeesTab } from './PaymentFeesTab'
import { useAuthStore } from '../../store/auth.store'

const ALL_TABS = [
  { key: 'courts', label: 'Quadras', icon: MapPin },
  { key: 'financial', label: 'Financeiro', icon: DollarSign },
  { key: 'users', label: 'Usuários', icon: Users, adminOnly: true },
] as const

type Tab = (typeof ALL_TABS)[number]['key']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('courts')
  const { user } = useAuthStore()

  const visibleTabs = ALL_TABS.filter((t) => !('adminOnly' in t && t.adminOnly) || user?.role === 'ADMIN')

  return (
    <Layout title="Configurações">
      <div className="flex flex-col gap-6">
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === t.key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'courts' && (
          <div className="flex flex-col gap-4">
            <CourtsManageSection />
            <CourtsConfigTab />
          </div>
        )}
        {activeTab === 'financial' && <PaymentFeesTab />}
        {activeTab === 'users' && user?.role === 'ADMIN' && <UsersTab />}
      </div>
    </Layout>
  )
}