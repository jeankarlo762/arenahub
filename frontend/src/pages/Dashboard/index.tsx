import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { CalendarDays, DollarSign, MapPin, Trophy, AlertTriangle, ReceiptText, Crown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import * as bookingsApi from '../../api/bookings.api'
import * as financialApi from '../../api/financial.api'
import * as courtsApi from '../../api/courts.api'
import * as tournamentsApi from '../../api/tournaments.api'
import * as barApi from '../../api/bar.api'
import type { Booking } from '../../types/booking'
import type { BarOrder } from '../../types/bar'
import type { FinancialSummary, DailyRevenue } from '../../types/financial'
import { formatCurrency } from '../../utils/format'
import { formatDate } from '../../utils/date'
import { toInputDate } from '../../utils/date'
import { BOOKING_STATUS_LABELS } from '../../utils/format'

export default function DashboardPage() {
  const today = toInputDate(new Date())
  const navigate = useNavigate()
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [activeCourts, setActiveCourts] = useState(0)
  const [upcomingTournaments, setUpcomingTournaments] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([])
  const [openOrders, setOpenOrders] = useState<BarOrder[]>([])
  const [topClients, setTopClients] = useState<{ customerName: string; total: number; orderCount: number }[]>([])

  const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      bookingsApi.listBookings({ date: today }),
      financialApi.getSummary({ startDate: monthStart }),
      financialApi.getDailyRevenue({ days: 7 }),
      courtsApi.listCourts({ active: true }),
      tournamentsApi.listTournaments(),
      bookingsApi.listBookings({ status: 'CONFIRMED' }),
      barApi.listOrders('OPEN'),
      barApi.getTopClients(),
    ])
      .then(([bookings, fin, daily, courts, tournaments, confirmed, orders, top]) => {
        if (bookings.status === 'fulfilled') setTodayBookings(bookings.value)
        if (fin.status === 'fulfilled') setSummary(fin.value)
        if (daily.status === 'fulfilled') setDailyRevenue(daily.value)
        if (courts.status === 'fulfilled') setActiveCourts(courts.value.length)
        if (tournaments.status === 'fulfilled') {
          setUpcomingTournaments(
            tournaments.value.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
          )
        }
        if (confirmed.status === 'fulfilled') {
          setPendingBookings(confirmed.value.filter((b) => !b.payment || b.payment.status === 'PENDING').slice(0, 5))
        }
        if (orders.status === 'fulfilled') setOpenOrders(orders.value)
        if (top.status === 'fulfilled') setTopClients(top.value as { customerName: string; total: number; orderCount: number }[])
      })
      .finally(() => setLoading(false))
  }, [today, monthStart])

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" className="text-orange-500" />
        </div>
      </Layout>
    )
  }

  const metrics = [
    { label: 'Agendamentos Hoje', value: todayBookings.length, icon: CalendarDays, color: 'text-orange-600', bg: 'bg-orange-50', to: '/bookings' },
    { label: 'Receita do Mês', value: formatCurrency(summary?.received ?? 0), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', to: '/financial' },
    { label: 'Quadras Ativas', value: activeCourts, icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50', to: '/courts' },
    { label: 'Torneios em Aberto', value: upcomingTournaments, icon: Trophy, color: 'text-orange-600', bg: 'bg-orange-50', to: '/tournaments' },
  ]

  return (
    <Layout title="Dashboard">
      <div className="flex flex-col gap-6">
        {/* Comandas alerts — compact queue */}
        {openOrders.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-700">Comandas em aberto:</span>
            </div>
            <div className="flex gap-1.5 flex-wrap flex-1 min-w-0">
              {openOrders.slice(0, 6).map((o) => (
                <button
                  key={o.id}
                  onClick={() => navigate('/comandas')}
                  className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-full text-xs font-medium text-amber-800 transition-colors whitespace-nowrap"
                >
                  <ReceiptText size={11} />
                  #{o.number} {o.customerName}
                </button>
              ))}
              {openOrders.length > 6 && (
                <button
                  onClick={() => navigate('/comandas')}
                  className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-full text-xs text-amber-700 transition-colors"
                >
                  +{openOrders.length - 6} mais
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <button key={m.label} onClick={() => navigate(m.to)} className="text-left">
              <Card className="hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`${m.bg} ${m.color} rounded-xl p-2 sm:p-3 shrink-0`}>
                    <m.icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{m.label}</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{m.value}</p>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Receita — Últimos 7 dias</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, 'dd/MM')} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} width={55} />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v)), 'Receita']}
                  labelFormatter={(l) => formatDate(l as string)}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Agendamentos Hoje</h2>
            {todayBookings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum agendamento hoje</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                {todayBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{b.customerName}</p>
                      <p className="text-gray-500 text-xs">{b.court?.name ?? '—'} · {b.startTime}–{b.endTime}</p>
                    </div>
                    <Badge label={BOOKING_STATUS_LABELS[b.status]} status={b.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {topClients.length > 0 && (
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Crown size={16} className="text-orange-500" /> Top Clientes — Consumo no Bar
            </h2>
            <div className="flex flex-col gap-1">
              {topClients.slice(0, 8).map((c, i) => (
                <div key={c.customerName} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                    {i + 1}
                  </span>
                  <p className="flex-1 text-sm font-medium text-gray-900 truncate">{c.customerName}</p>
                  <p className="text-xs text-gray-400 shrink-0">{c.orderCount} comanda{c.orderCount !== 1 ? 's' : ''}</p>
                  <p className="text-sm font-semibold text-green-700 shrink-0">{formatCurrency(c.total)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Pendentes de Pagamento</h2>
          {pendingBookings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum pagamento pendente</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="pb-2 pr-4 whitespace-nowrap">Cliente</th>
                    <th className="pb-2 pr-4 whitespace-nowrap">Quadra</th>
                    <th className="pb-2 pr-4 whitespace-nowrap hidden sm:table-cell">Data</th>
                    <th className="pb-2 pr-4 whitespace-nowrap hidden sm:table-cell">Horário</th>
                    <th className="pb-2 whitespace-nowrap">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="py-2 pr-4 font-medium text-gray-900">{b.customerName}</td>
                      <td className="py-2 pr-4 text-gray-600">{b.court?.name ?? '—'}</td>
                      <td className="py-2 pr-4 text-gray-600 hidden sm:table-cell">{formatDate(b.date)}</td>
                      <td className="py-2 pr-4 text-gray-600 hidden sm:table-cell">{b.startTime}–{b.endTime}</td>
                      <td className="py-2 font-medium text-gray-900">{formatCurrency(Number(b.totalPrice))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
