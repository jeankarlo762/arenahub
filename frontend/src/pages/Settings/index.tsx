import { useState } from 'react'
import { Layout } from '../../components/layout/Layout'
import { UsersTab } from './UsersTab'
import { CourtsConfigTab } from './CourtsConfigTab'
import { CourtsManageSection } from './CourtsManageSection'
import { PaymentFeesTab } from './PaymentFeesTab'
import { useAuthStore } from '../../store/auth.store'

const ALL_TABS = [
  { key: 'courts', label: 'Quadras' },
  { key: 'financial', label: 'Financeiro' },
  { key: 'users', label: 'Usuários', adminOnly: true },
] as const

type Tab = (typeof ALL_TABS)[number]['key']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('courts')
  const { user } = useAuthStore()

  const visibleTabs = ALL_TABS.filter((t) => !('adminOnly' in t && t.adminOnly) || user?.role === 'ADMIN')

  return (
    <Layout title="Configurações">
      <div className="flex flex-col gap-6">
        <div className="flex gap-2 flex-wrap">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.label}
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
