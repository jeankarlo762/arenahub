import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
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
import { CHART_COLORS, METHOD_LABELS } from '../../constants/shared'

const COLORS = CHART_COLORS

type Source = 'courts' | 'bar' | 'rentals' | 'all'
type QuickPeriod = 'today' | 'week' | 'month' | 'custom'

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

export default function FinancialPage() {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = `${today.slice(0, 7)}-01`

  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('month')
  const [startDate, setStartDate] = useState(monthStart)
  const [endDate, setEndDate] = useState(today)
  const [source, setSource] = useState<Source>('courts')

  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [prevSummary, setPrevSummary] = useState<FinancialSummary | null>(null)
  const [daily, setDaily] = useState<DailyRevenue[]>([])
  const [byCourt, setByCourt] = useState<RevenueItem[]>([])
  const [byMethod, setByMethod] = useState<RevenueItem[]>([])
  const [barStats, setBarStats] = useState<BarStats | null>(null)
  const [loading, setLoading] = useState(true)

  function getPrevPeriod(start: string, end: string): { prevStart: string; prevEnd: string } {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
    const prevEnd = new Date(s.getTime() - 86400000)
    const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000)
    return {
      prevStart: prevStart.toISOString().slice(0, 10),
      prevEnd: prevEnd.toISOString().slice(0, 10),
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { startDate, endDate, source }
      const showCourts = source === 'courts' || source === 'all'
      const { prevStart, prevEnd } = getPrevPeriod(startDate, endDate)
      const [s, d, c, m, bs, prev] = await Promise.all([
        financialApi.getSummary(params),
        financialApi.getDailyRevenue(params),
        showCourts ? financialApi.getRevenueByCourt({ startDate, endDate }) : Promise.resolve([]),
        financialApi.getRevenueByMethod({ startDate, endDate, source }),
        source === 'bar' ? barApi.getBarStats(startDate, endDate) : Promise.resolve(null),
        financialApi.getSummary({ startDate: prevStart, endDate: prevEnd, source }),
      ])
      setSummary(s)
      setPrevSummary(prev)
      setDaily(d)
      setByCourt(c)
      setByMethod(m)
      setBarStats(bs)
    } catch {
      toast.error('Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, source])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onFocus() { load() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  function applyQuickPeriod(p: QuickPeriod) {
    setQuickPeriod(p)
    if (p !== 'custom') {
      const { start, end } = getPeriodDates(p)
      setStartDate(start)
      setEndDate(end)
    }
  }

  function pctChange(curr: number, prev: number): string | null {
    if (!prev) return null
    const pct = ((curr - prev) / prev) * 100
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
  }

  function deltaColor(curr: number, prev: number, invertSign = false): string {
    const up = curr >= prev
    return (up !== invertSign) ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
  }

  const summaryCards = [
    {
      label: 'Total', value: formatCurrency(summary?.total ?? 0), color: 'text-gray-900 dark:text-gray-100', cardClass: '',
      delta: pctChange(summary?.total ?? 0, prevSummary?.total ?? 0),
      deltaColor: deltaColor(summary?.total ?? 0, prevSummary?.total ?? 0),
    },
    {
      label: 'Recebido', value: formatCurrency(summary?.received ?? 0), color: 'text-green-700 dark:text-green-400', cardClass: 'border-green-200 dark:border-green-700 bg-green-50/30 dark:bg-green-900/20',
      delta: pctChange(summary?.received ?? 0, prevSummary?.received ?? 0),
      deltaColor: deltaColor(summary?.received ?? 0, prevSummary?.received ?? 0),
    },
    {
      label: 'Pendente', value: formatCurrency(summary?.pending ?? 0), color: 'text-red-600 dark:text-red-400', cardClass: (summary?.pending ?? 0) > 0 ? 'border-red-200 dark:border-red-700 bg-red-50/30 dark:bg-red-900/20' : '',
      delta: pctChange(summary?.pending ?? 0, prevSummary?.pending ?? 0),
      deltaColor: deltaColor(summary?.pending ?? 0, prevSummary?.pending ?? 0, true),
    },
    {
      label: 'Transações', value: summary?.paymentCount ?? 0, color: 'text-orange-700 dark:text-orange-400', cardClass: '',
      delta: pctChange(summary?.paymentCount ?? 0, prevSummary?.paymentCount ?? 0),
      deltaColor: deltaColor(summary?.paymentCount ?? 0, prevSummary?.paymentCount ?? 0),
    },
  ]

  return (
    <Layout title="Financeiro">
      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Período</span>
              <div className="flex gap-2 flex-wrap">
                {(['today', 'week', 'month', 'custom'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => applyQuickPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      quickPeriod === p
                        ? 'bg-orange-500 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Personalizado'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end gap-3 flex-wrap">
              <DatePicker label="De" value={startDate} onChange={(e) => { setStartDate(e.target.value); setQuickPeriod('custom') }} className="w-36" />
              <DatePicker label="Até" value={endDate} onChange={(e) => { setEndDate(e.target.value); setQuickPeriod('custom') }} className="w-36" />
              <Button variant="secondary" onClick={load}>Filtrar</Button>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Origem</span>
              <div className="flex gap-2 flex-wrap">
                {([['courts', 'Quadras'], ['bar', 'Bar'], ['rentals', 'Locação'], ['all', 'Tudo']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSource(val)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      source === val
                        ? 'bg-orange-500 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {summaryCards.map((c) => (
                <Card key={c.label} className={c.cardClass}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{c.label}</p>
                  <p className={`text-xl sm:text-2xl font-bold ${c.color}`}>{c.value}</p>
                  {c.delta && (
                    <p className={`text-xs mt-1 font-medium ${c.deltaColor}`}>
                      {c.delta} vs. período anterior
                    </p>
                  )}
                </Card>
              ))}
            </div>

            <Card>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Receita Diária</h2>
              {daily.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">Sem dados no período selecionado</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, 'dd/MM')} tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Receita']} labelFormatter={(l) => formatDate(l as string)} />
                    <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {(source === 'courts' || source === 'all') && (
                <Card>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Receita por Quadra</h2>
                  {byCourt.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Sem dados</p>
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
              )}

              <Card>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Formas de Pagamento</h2>
                {byMethod.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Sem dados no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={byMethod.map((m) => ({ name: METHOD_LABELS[m.method ?? ''] ?? (m.method || 'Outro'), value: m.revenue, count: m.count }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v, _n, p) => [
                          `${formatCurrency(Number(v))} (${(p.payload as { count: number }).count} transações)`,
                          'Total',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            {source === 'bar' && barStats && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Produtos Mais Vendidos</h2>
                    {barStats.topProducts.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Sem dados no período</p>
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
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Maior Margem de Lucro (produtos vendidos no período)</h2>
                  {barStats.byMargin.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Sem dados no período</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">#</th>
                            <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Produto</th>
                            <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Custo</th>
                            <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Venda</th>
                            <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Qtd</th>
                            <th className="text-right py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Margem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {barStats.byMargin.map((p, i) => (
                            <tr key={p.productId} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                              <td className="py-2 pr-4 text-gray-400 dark:text-gray-500 font-mono text-xs">{i + 1}</td>
                              <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                              <td className="py-2 pr-4 text-right text-gray-600 dark:text-gray-400">{formatCurrency(p.costPrice)}</td>
                              <td className="py-2 pr-4 text-right text-gray-600 dark:text-gray-400">{formatCurrency(p.salePrice)}</td>
                              <td className="py-2 pr-4 text-right text-gray-500 dark:text-gray-400">{p.quantity}</td>
                              <td className="py-2 text-right">
                                <span className={`font-semibold ${p.margin >= 50 ? 'text-green-600 dark:text-green-400' : p.margin >= 20 ? 'text-orange-500 dark:text-orange-400' : 'text-red-500 dark:text-red-400'}`}>
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
        )}
      </div>
    </Layout>
  )
}