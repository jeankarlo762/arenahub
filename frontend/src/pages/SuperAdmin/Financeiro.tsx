import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { DollarSign, TrendingUp, Building2, Calendar } from 'lucide-react'
import * as superAdminApi from '../../api/superadmin.api'
import type { FinancialOverview } from '../../types/tenant'
import { Spinner } from '../../components/ui/Spinner'
import { formatCurrency } from '../../utils/format'
import { SuperAdminLayout } from './SuperAdminLayout'

const planLabels: Record<string, string> = { BASIC: 'Basic', PRO: 'Pro', ENTERPRISE: 'Enterprise' }
const planColors: Record<string, string> = {
  BASIC: 'bg-gray-100 text-gray-600',
  PRO: 'bg-blue-100 text-blue-700',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
}

export default function FinanceiroPage() {
  const [data, setData] = useState<FinancialOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    superAdminApi.getFinancialOverview()
      .then(setData)
      .catch(() => toast.error('Erro ao carregar financeiro'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <SuperAdminLayout title="Financeiro" subtitle="Receita recorrente das assinaturas">
        <div className="flex items-center justify-center py-16 gap-3">
          <Spinner size="md" />
          <span className="text-sm text-gray-400">Carregando...</span>
        </div>
      </SuperAdminLayout>
    )
  }

  if (!data) return null

  const stats = [
    { label: 'MRR (Receita Mensal)', value: formatCurrency(data.activeMrr), icon: DollarSign, color: 'text-green-600 bg-green-50' },
    { label: 'ARR (Receita Anual)', value: formatCurrency(data.arr), icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
    { label: 'Tenants Ativos', value: String(data.activeTenants), icon: Building2, color: 'text-orange-600 bg-orange-50' },
    { label: 'Total de Tenants', value: String(data.totalTenants), icon: Calendar, color: 'text-purple-600 bg-purple-50' },
  ]

  return (
    <SuperAdminLayout title="Financeiro" subtitle="Receita recorrente das assinaturas dos tenants">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue by plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Receita por Plano</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {data.byPlan.map((p) => (
            <div key={p.plan} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${planColors[p.plan]}`}>
                  {planLabels[p.plan]}
                </span>
                <span className="text-xs text-gray-400">{formatCurrency(p.price)}/mês</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(p.revenue)}</p>
              <p className="text-xs text-gray-500 mt-1">{p.count} tenant(s)</p>
            </div>
          ))}
        </div>
      </div>

      {/* Billing per tenant */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Faturamento por Tenant</h2>
        </div>
        {data.tenants.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Nenhum tenant cadastrado</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Arena', 'Plano', 'Status', 'Valor Mensal'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.tenants.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-gray-900">{t.name}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${planColors[t.plan]}`}>
                      {planLabels[t.plan]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${t.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${t.active ? 'bg-green-500' : 'bg-red-400'}`} />
                      {t.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className={`px-5 py-4 text-sm font-semibold ${t.active ? 'text-green-600' : 'text-gray-400 line-through'}`}>
                    {formatCurrency(t.monthlyValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SuperAdminLayout>
  )
}
