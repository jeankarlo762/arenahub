import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { DollarSign, TrendingUp, Wrench, Building2 } from 'lucide-react'
import * as superAdminApi from '../../api/superadmin.api'
import type { FinancialOverview } from '../../types/tenant'
import { Spinner } from '../../components/ui/Spinner'
import { DatePicker } from '../../components/ui/DatePicker'
import { formatCurrency } from '../../utils/format'
import { SuperAdminLayout } from './SuperAdminLayout'

type Period = 'today' | 'week' | 'month' | 'custom'

function toInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function rangeFor(period: Exclude<Period, 'custom'>): { startDate: string; endDate: string } {
  const now = new Date()
  const end = toInput(now)
  if (period === 'today') return { startDate: end, endDate: end }
  if (period === 'week') {
    const s = new Date(now); s.setDate(now.getDate() - 6)
    return { startDate: toInput(s), endDate: end }
  }
  const s = new Date(now.getFullYear(), now.getMonth(), 1)
  return { startDate: toInput(s), endDate: end }
}

export default function FinanceiroPage() {
  const [data, setData] = useState<FinancialOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [startDate, setStartDate] = useState(() => rangeFor('month').startDate)
  const [endDate, setEndDate] = useState(() => rangeFor('month').endDate)

  const load = useCallback(async (sd: string, ed: string) => {
    setLoading(true)
    try {
      setData(await superAdminApi.getFinancialOverview({ startDate: sd, endDate: ed }))
    } catch {
      toast.error('Erro ao carregar financeiro')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(startDate, endDate) }, [load, startDate, endDate])

  function selectPeriod(p: Exclude<Period, 'custom'>) {
    const r = rangeFor(p)
    setPeriod(p)
    setStartDate(r.startDate)
    setEndDate(r.endDate)
  }

  const stats = data ? [
    { label: 'MRR (Receita Mensal)', value: formatCurrency(data.mrr), icon: DollarSign, color: 'text-green-600 bg-green-50' },
    { label: 'ARR (Receita Anual)', value: formatCurrency(data.arr), icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
    { label: 'Implantação no período', value: formatCurrency(data.setupRevenue), icon: Wrench, color: 'text-orange-600 bg-orange-50' },
    { label: 'Novos tenants no período', value: String(data.newTenantsInPeriod), icon: Building2, color: 'text-purple-600 bg-purple-50' },
  ] : []

  return (
    <SuperAdminLayout title="Financeiro" subtitle="Receita recorrente e de implantação das arenas">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap items-end gap-3">
        <div className="flex gap-1.5">
          {([['today', 'Hoje'], ['week', 'Semana'], ['month', 'Mês']] as const).map(([p, label]) => (
            <button
              key={p}
              onClick={() => selectPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <DatePicker label="De" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPeriod('custom') }} className="w-40" />
        <DatePicker label="Até" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPeriod('custom') }} className="w-40" />
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Spinner size="md" />
          <span className="text-sm text-gray-400">Carregando...</span>
        </div>
      ) : (
        <>
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
                    {['Arena', 'Cadastro', 'Status', 'MRR', 'Implantação'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.tenants.map((t) => (
                    <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">{t.name}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{new Date(t.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${t.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${t.active ? 'bg-green-500' : 'bg-red-400'}`} />
                          {t.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className={`px-5 py-4 text-sm font-semibold ${t.active ? 'text-green-600' : 'text-gray-400 line-through'}`}>
                        {formatCurrency(t.mrrValue)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{formatCurrency(t.setupFee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </SuperAdminLayout>
  )
}
