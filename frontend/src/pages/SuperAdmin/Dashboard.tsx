import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  Building2, CheckCircle, XCircle, UsersRound, DollarSign, TrendingUp,
} from 'lucide-react'
import * as superAdminApi from '../../api/superadmin.api'
import type { Tenant, GlobalUser } from '../../types/tenant'
import { Spinner } from '../../components/ui/Spinner'
import { formatCurrency } from '../../utils/format'
import { SuperAdminLayout } from './SuperAdminLayout'

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [users, setUsers] = useState<GlobalUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [t, u] = await Promise.all([superAdminApi.listTenants(), superAdminApi.listAllUsers()])
        setTenants(t)
        setUsers(u)
      } catch {
        toast.error('Erro ao carregar o dashboard')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const metrics = useMemo(() => {
    const active = tenants.filter((t) => t.active)
    const mrr = active.reduce((s, t) => s + Number(t.mrrValue || 0), 0)
    const setupTotal = tenants.reduce((s, t) => s + Number(t.setupFee || 0), 0)
    const admins = users.filter((u) => u.role === 'ADMIN').length
    return {
      total: tenants.length,
      active: active.length,
      inactive: tenants.length - active.length,
      users: users.length,
      admins,
      operators: users.length - admins,
      mrr,
      arr: mrr * 12,
      setupTotal,
    }
  }, [tenants, users])

  // Novas arenas por mês (últimos 6 meses)
  const monthly = useMemo(() => {
    const now = new Date()
    const buckets: { key: string; label: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()], count: 0 })
    }
    const index = new Map(buckets.map((b, i) => [b.key, i]))
    for (const t of tenants) {
      const d = new Date(t.createdAt)
      const k = `${d.getFullYear()}-${d.getMonth()}`
      const i = index.get(k)
      if (i !== undefined) buckets[i].count += 1
    }
    return buckets
  }, [tenants])

  // Top arenas por MRR (ativas)
  const topMrr = useMemo(() => {
    return [...tenants]
      .filter((t) => t.active && Number(t.mrrValue) > 0)
      .sort((a, b) => Number(b.mrrValue) - Number(a.mrrValue))
      .slice(0, 5)
  }, [tenants])
  const maxMrr = topMrr.length ? Number(topMrr[0].mrrValue) : 0

  // Arenas recentes
  const recent = useMemo(() => {
    return [...tenants]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
  }, [tenants])

  const stats = [
    { label: 'Total de Arenas', value: String(metrics.total), icon: Building2, color: 'text-blue-600 bg-blue-50' },
    { label: 'Arenas Ativas', value: String(metrics.active), icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Arenas Inativas', value: String(metrics.inactive), icon: XCircle, color: 'text-red-500 bg-red-50' },
    { label: 'Usuários', value: String(metrics.users), icon: UsersRound, color: 'text-purple-600 bg-purple-50' },
    { label: 'MRR (Receita Mensal)', value: formatCurrency(metrics.mrr), icon: DollarSign, color: 'text-green-600 bg-green-50' },
    { label: 'ARR (Receita Anual)', value: formatCurrency(metrics.arr), icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
  ]

  return (
    <SuperAdminLayout title="Dashboard" subtitle="Visão geral da plataforma e das arenas">
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Spinner size="md" />
          <span className="text-sm text-gray-400">Carregando...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                  <s.icon size={20} />
                </div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Novas arenas por mês */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Novas arenas por mês</h2>
              {tenants.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#fff7ed' }}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
                      formatter={(v: number) => [`${v} arena(s)`, 'Novas']}
                    />
                    <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top arenas por MRR */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Top arenas por MRR</h2>
              {topMrr.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">Nenhuma arena ativa com MRR</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {topMrr.map((t) => (
                    <div key={t.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 truncate">{t.name}</span>
                        <span className="font-semibold text-green-600 shrink-0 ml-2">{formatCurrency(Number(t.mrrValue))}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: maxMrr ? `${(Number(t.mrrValue) / maxMrr) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Arenas recentes + composição de usuários */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Arenas recentes</h2>
              </div>
              {recent.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">Nenhuma arena cadastrada</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Arena', 'Cadastro', 'Usuários', 'Status'].map((h) => (
                        <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((t) => (
                      <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">{t.name}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">{new Date(t.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{t._count?.users ?? 0}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${t.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${t.active ? 'bg-green-500' : 'bg-red-400'}`} />
                            {t.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Composição */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Status das arenas</h2>
                <SplitBar active={metrics.active} inactive={metrics.inactive} />
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> {metrics.active} ativas</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> {metrics.inactive} inativas</span>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Usuários por função</h2>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Administradores</span>
                  <span className="font-semibold text-blue-600">{metrics.admins}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1.5">
                  <span className="text-gray-600">Operadores</span>
                  <span className="font-semibold text-gray-700">{metrics.operators}</span>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Receita de implantação (total)</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(metrics.setupTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  )
}

function SplitBar({ active, inactive }: { active: number; inactive: number }) {
  const total = active + inactive
  const activePct = total ? (active / total) * 100 : 0
  return (
    <div className="h-3 w-full rounded-full overflow-hidden bg-gray-100 flex">
      <div className="h-full bg-green-500" style={{ width: `${activePct}%` }} />
      <div className="h-full bg-red-400" style={{ width: `${100 - activePct}%` }} />
    </div>
  )
}
