import { useState, useEffect, useCallback } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { DatePicker } from '../../components/ui/DatePicker'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import * as financialApi from '../../api/financial.api'
import * as barApi from '../../api/bar.api'
import type { BarStats } from '../../api/bar.api'
import type { FinancialSummary, DailyRevenue, RevenueItem } from '../../types/financial'
import { formatCurrency } from '../../utils/format'
import { formatDate } from '../../utils/date'

const COLORS = ['#f97316', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Crédito',
  DEBIT_CARD: 'Débito',
  PIX: 'PIX',
  TRANSFER: 'Transf.',
}

type Source = 'courts' | 'bar' | 'all'
type QuickPeriod = 'today' | 'week' | 'month' | 'custom'
type Tab = 'overview' | 'history'

function getPeriodDates(period: QuickPeriod): { start: string; end: string } {
  const today = new Date().toISOString().slice(0, 10)
  if (period === 'today') return { start: today, end: today }
  if (period === 'week') {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return { start: d.toISOString().slice(0, 10), end: today }
  }
  if (period === 'month') return { start: `${today.slice(0, 7)}-01`, end: today }
  return { start: `${today.slice(0, 7)}-01`, end: today }
}

interface Transaction {
  id: string
  date: string
  type: 'court' | 'bar'
  customerName: string
  description: string
  amount: number
  method: string
  status?: string
}

export default function FinancialPage() {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = `${today.slice(0, 7)}-01`
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('month')
  const [startDate, setStartDate] = useState(monthStart)
  const [endDate, setEndDate] = useState(today)
  const [source, setSource] = useState<Source>('courts')

  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [daily, setDaily] = useState<DailyRevenue[]>([])
  const [byCourt, setByCourt] = useState<RevenueItem[]>([])
  const [byMethod, setByMethod] = useState<RevenueItem[]>([])
  const [barStats, setBarStats] = useState<BarStats | null>(null)
  const [loading, setLoading] = useState(true)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { startDate, endDate, source }
      const [s, d, c, m, bs] = await Promise.all([
        financialApi.getSummary(params),
        financialApi.getDailyRevenue(params),
        source !== 'bar' ? financialApi.getRevenueByCourt({ startDate, endDate }) : Promise.resolve([]),
        source !== 'bar' ? financialApi.getRevenueByMethod({ startDate, endDate }) : Promise.resolve([]),
        source === 'bar' ? barApi.getBarStats(startDate, endDate) : Promise.resolve(null),
      ])
      setSummary(s)
      setDaily(d)
      setByCourt(c)
      setByMethod(m)
      setBarStats(bs)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, source])

  const loadTransactions = useCallback(async () => {
    setTxLoading(true)
    try {
      const data = await financialApi.getTransactions({ startDate, endDate })
      setTransactions(data)
    } catch {
      setTransactions([])
    } finally {
      setTxLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (activeTab === 'history') loadTransactions()
  }, [activeTab, loadTransactions])

  function applyQuickPeriod(p: QuickPeriod) {
    setQuickPeriod(p)
    if (p !== 'custom') {
      const { start, end } = getPeriodDates(p)
      setStartDate(start)
      setEndDate(end)
    }
  }

  const summaryCards = [
    { label: 'Total', value: formatCurrency(summary?.total ?? 0), color: 'text-gray-900' },
    { label: 'Recebido', value: formatCurrency(summary?.received ?? 0), color: 'text-green-700' },
    { label: 'Pendente', value: formatCurrency(summary?.pending ?? 0), color: 'text-orange-600' },
    { label: 'Transações', value: summary?.paymentCount ?? 0, color: 'text-orange-700' },
  ]

  return (
    <Layout title="Financeiro">
      <div className="flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex gap-2">
          {(['overview', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab === 'overview' ? 'Visão Geral' : 'Histórico de Transações'}
            </button>
          ))}
        </div>

        {/* Filters (shared) */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            {(['today', 'week', 'month', 'custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => applyQuickPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  quickPeriod === p ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Personalizado'}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <DatePicker label="De" value={startDate} onChange={(e) => { setStartDate(e.target.value); setQuickPeriod('custom') }} className="w-36" />
            <DatePicker label="Até" value={endDate} onChange={(e) => { setEndDate(e.target.value); setQuickPeriod('custom') }} className="w-36" />
            <Button variant="secondary" onClick={() => { load(); if (activeTab === 'history') loadTransactions() }}>Filtrar</Button>
          </div>

          {activeTab === 'overview' && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-600 self-center">Origem:</span>
              {([['courts', 'Quadras'], ['bar', 'Bar'], ['all', 'Tudo']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSource(val)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    source === val ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {summaryCards.map((c) => (
                  <Card key={c.label}>
                    <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                    <p className={`text-xl sm:text-2xl font-bold ${c.color}`}>{c.value}</p>
                  </Card>
                ))}
              </div>

              <Card>
                <h2 className="text-base font-semibold text-gray-900 mb-4">Receita Diária</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, 'dd/MM')} tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Receita']} labelFormatter={(l) => formatDate(l as string)} />
                    <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {source !== 'bar' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card>
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Receita por Quadra</h2>
                    {byCourt.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={byCourt} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                          <XAxis type="number" tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                          <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Receita']} />
                          <Bar dataKey="revenue" fill="#f97316" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Card>

                  <Card>
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Métodos de Pagamento</h2>
                    {byMethod.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={byMethod.map((m) => ({ name: METHOD_LABELS[m.method ?? ''] ?? m.method, value: m.revenue }))}
                            cx="50%" cy="50%" outerRadius={70} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Receita']} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </Card>
                </div>
              )}

              {source === 'bar' && barStats && (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Card>
                      <h2 className="text-base font-semibold text-gray-900 mb-4">Formas de Pagamento</h2>
                      {barStats.byPaymentMethod.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">Sem dados no período</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={barStats.byPaymentMethod.map((m) => ({ name: METHOD_LABELS[m.method] ?? m.method, value: m.total, count: m.count }))}
                              cx="50%" cy="50%" outerRadius={75} dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {barStats.byPaymentMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v, _n, p) => [`${formatCurrency(Number(v))} (${(p.payload as { count: number }).count} comandas)`, 'Total']} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </Card>

                    <Card>
                      <h2 className="text-base font-semibold text-gray-900 mb-4">Produtos Mais Vendidos</h2>
                      {barStats.topProducts.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">Sem dados no período</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={barStats.topProducts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                            <Tooltip formatter={(v) => [`${v} un.`, 'Qtd']} />
                            <Bar dataKey="quantity" fill="#f97316" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </Card>
                  </div>

                  <Card>
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Maior Margem de Lucro</h2>
                    {barStats.byMargin.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">Sem dados no período</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              {['#', 'Produto', 'Custo', 'Venda', 'Qtd', 'Margem'].map((h) => (
                                <th key={h} className="text-left py-2 pr-4 last:text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {barStats.byMargin.map((p, i) => (
                              <tr key={p.productId} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{i + 1}</td>
                                <td className="py-2 pr-4 font-medium text-gray-900">{p.name}</td>
                                <td className="py-2 pr-4 text-right text-gray-600">{formatCurrency(p.costPrice)}</td>
                                <td className="py-2 pr-4 text-right text-gray-600">{formatCurrency(p.salePrice)}</td>
                                <td className="py-2 pr-4 text-right text-gray-500">{p.quantity}</td>
                                <td className="py-2 text-right">
                                  <span className={`font-semibold ${p.margin >= 50 ? 'text-green-600' : p.margin >= 20 ? 'text-orange-500' : 'text-red-500'}`}>
                                    {p.margin.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </>
          )
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          txLoading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">Nenhuma transação no período</div>
          ) : (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Histórico de Transações</h2>
                <span className="text-sm text-gray-400">{transactions.length} transação{transactions.length !== 1 ? 'ões' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                      <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                      <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                      <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</th>
                      <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Método</th>
                      <th className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tx.type === 'bar' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                            {tx.type === 'bar' ? 'Bar' : 'Quadra'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-medium text-gray-900">{tx.customerName}</td>
                        <td className="py-3 pr-4 text-gray-500 max-w-xs truncate">{tx.description}</td>
                        <td className="py-3 pr-4 text-gray-600">{METHOD_LABELS[tx.method] ?? tx.method}</td>
                        <td className="py-3 text-right font-semibold text-green-700">{formatCurrency(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={5} className="pt-3 text-sm font-semibold text-gray-700">Total</td>
                      <td className="pt-3 text-right font-bold text-gray-900">
                        {formatCurrency(transactions.reduce((s, t) => s + t.amount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )
        )}
      </div>
    </Layout>
  )
}
