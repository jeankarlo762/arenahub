import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { DatePicker } from '../../components/ui/DatePicker'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { formatCurrency } from '../../utils/format'
import * as financialApi from '../../api/financial.api'
import * as barApi from '../../api/bar.api'
import * as rentalsApi from '../../api/rentals.api'
import * as tournamentsApi from '../../api/tournaments.api'
import type { FinancialSummary } from '../../types/financial'
import type { BarStats } from '../../api/bar.api'
import type { RentalReport } from '../../api/rentals.api'
import type { Tournament } from '../../types/tournament'
import { TOURNAMENT_STATUS_LABELS } from '../../utils/format'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { formatDate } from '../../utils/date'
import { CHART_COLORS, WEEKDAY_LABELS } from '../../constants/shared'

const COLORS = CHART_COLORS

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = `${today.slice(0, 7)}-01`

  const [startDate, setStartDate] = useState(monthStart)
  const [endDate, setEndDate] = useState(today)
  const [loading, setLoading] = useState(true)

  const [courtsSummary, setCourtsSummary] = useState<FinancialSummary | null>(null)
  const [barStats, setBarStats] = useState<BarStats | null>(null)
  const [rentalReport, setRentalReport] = useState<RentalReport | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [daily, setDaily] = useState<{ date: string; revenue: number }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cs, bs, rr, ts, d] = await Promise.all([
        financialApi.getSummary({ startDate, endDate, source: 'courts' }),
        barApi.getBarStats(startDate, endDate),
        rentalsApi.getRentalReport({ startDate, endDate }),
        tournamentsApi.listTournaments(),
        financialApi.getDailyRevenue({ startDate, endDate, source: 'all' }),
      ])
      setCourtsSummary(cs)
      setBarStats(bs)
      setRentalReport(rr)
      setTournaments(ts)
      setDaily(d)
    } catch {
      toast.error('Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { load() }, [load])

  const finishedTournaments = tournaments.filter(t => t.status === 'FINISHED')
  const activeTournaments = tournaments.filter(t => t.status === 'IN_PROGRESS' || t.status === 'OPEN')

  const courtsReceived = courtsSummary?.received ?? 0
  const barRevenue = barStats?.revenue ?? 0
  const rentalsEstimated = rentalReport?.estimatedRevenue ?? 0
  const totalGeral = courtsReceived + barRevenue + rentalsEstimated

  return (
    <Layout title="Relatório Geral">
      <div className="flex flex-col gap-6">
        {/* Date filter */}
        <div className="flex items-end gap-3 flex-wrap">
          <DatePicker label="De" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
          <DatePicker label="Até" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
          <Button variant="secondary" onClick={load}>Atualizar</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
        ) : (
          <>
            {/* ─── Receita total ─── */}
            <section>
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">Receita por Origem (período)</h2>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quadras (recebido)</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(courtsReceived)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{courtsSummary?.paymentCount ?? 0} pagamento(s)</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bar</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(barRevenue)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{barStats?.orderCount ?? 0} comandas</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Locações (estimado)</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(rentalsEstimated)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{rentalReport?.activeCount ?? 0} locações ativas</p>
                </Card>
                <Card className="border-orange-200 dark:border-orange-700 bg-orange-50/40 dark:bg-orange-900/20">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Geral</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(totalGeral)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Quadras + Bar + Locações</p>
                </Card>
              </div>
            </section>

            {/* ─── Receita diária ─── */}
            {daily.length > 0 && (
              <Card>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Receita Diária</h2>
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
            )}

            {/* ─── Bar ─── */}
            {barStats && (
              <section>
                <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">Bar</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Produtos mais vendidos</h3>
                    {barStats.topProducts.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Sem dados</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={barStats.topProducts} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                          <Tooltip formatter={(v) => [`${v} un.`, 'Qtd']} />
                          <Bar dataKey="quantity" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Card>

                  <Card>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Resumo do bar</h3>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Total de comandas</span>
                        <span className="font-semibold">{barStats.orderCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Ticket médio</span>
                        <span className="font-semibold">{formatCurrency(barStats.avgTicket)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Itens vendidos</span>
                        <span className="font-semibold">{barStats.itemCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Receita total</span>
                        <span className="font-bold text-green-700 dark:text-green-400">{formatCurrency(barStats.revenue)}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </section>
            )}

            {/* ─── Locações ─── */}
            {rentalReport && (
              <section>
                <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">Locações</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Quadras com mais locações</h3>
                    {rentalReport.topCourts.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Sem dados</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {rentalReport.topCourts.slice(0, 5).map((c, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-sm py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-[10px] font-bold text-orange-600 dark:text-orange-400 shrink-0">{i + 1}</div>
                              <span className="truncate font-medium">{c.courtName}</span>
                            </div>
                            <span className="shrink-0 text-orange-600 dark:text-orange-400 font-semibold">{formatCurrency(c.estimatedRevenue)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Atividade por dia da semana</h3>
                    {rentalReport.weekdayActivity.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Sem dados</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={rentalReport.weekdayActivity.map(w => ({ name: WEEKDAY_LABELS[w.weekday], v: w.rentalCount }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => [`${v}`, 'Locações']} />
                          <Bar dataKey="v" fill="#f97316" radius={[4, 4, 0, 0]}>
                            {rentalReport.weekdayActivity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Card>
                </div>
              </section>
            )}

            {/* ─── Torneios ─── */}
            <section>
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">Torneios</h2>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tournaments.length}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Em andamento</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{activeTournaments.length}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Finalizados</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{finishedTournaments.length}</p>
                </Card>
                <Card>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total de participantes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {tournaments.reduce((s, t) => s + (t._count?.teams ?? t.teams?.length ?? 0), 0)}
                  </p>
                </Card>
              </div>

              {tournaments.length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Todos os torneios</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Torneio</th>
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Esporte</th>
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                          <th className="text-right py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Participantes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tournaments.map((t) => (
                          <tr key={t.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">{t.name}</td>
                            <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{t.sport}</td>
                            <td className="py-2 pr-4">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                t.status === 'FINISHED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                t.status === 'IN_PROGRESS' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                                t.status === 'OPEN' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                                'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}>
                                {TOURNAMENT_STATUS_LABELS[t.status]}
                              </span>
                            </td>
                            <td className="py-2 text-right text-gray-600 dark:text-gray-400">{t._count?.teams ?? t.teams?.length ?? 0} / {t.maxTeams}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  )
}