import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import {
  CalendarDays, MapPin, Trophy, AlertTriangle, ReceiptText,
  Crown, DollarSign, Clock, TrendingUp, TrendingDown,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import * as bookingsApi from '../../api/bookings.api'
import * as financialApi from '../../api/financial.api'
import * as courtsApi from '../../api/courts.api'
import * as tournamentsApi from '../../api/tournaments.api'
import * as barApi from '../../api/bar.api'
import * as rentalsApi from '../../api/rentals.api'
import type { OverduePayment } from '../../api/rentals.api'
import type { Booking } from '../../types/booking'
import type { BarOrder } from '../../types/bar'
import type { FinancialSummary, DailyRevenue } from '../../types/financial'
import { formatCurrency, BOOKING_STATUS_LABELS } from '../../utils/format'
import { formatDate, toInputDate } from '../../utils/date'
import { useAuthStore } from '../../store/auth.store'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-6 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  )
}

function SkeletonRows({ n = 3 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function isUrgent(b: Booking, today: string): boolean {
  if (b.date !== today || b.status === 'CANCELLED' || b.status === 'COMPLETED') return false
  const now = new Date()
  const [h, m] = b.startTime.split(':').map(Number)
  const start = new Date()
  start.setHours(h, m, 0, 0)
  const diff = start.getTime() - now.getTime()
  return diff > 0 && diff <= 2 * 60 * 60 * 1000
}

function MoMBadge({ current, previous }: { current: number; previous: number }) {
  if (!previous) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  const up = pct >= 0
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium mt-0.5 ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? '+' : ''}{pct}% vs mês ant.
    </span>
  )
}

function RefreshBar({ loading, lastUpdated }: { loading: boolean; lastUpdated: Date | null }) {
  return (
    <div className="flex items-center justify-end gap-2 text-xs text-gray-400">
      {lastUpdated && !loading && (
        <span>Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      )}
    </div>
  )
}

function BookingRow({ b, today }: { b: Booking; today: string }) {
  const urgent = isUrgent(b, today)
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg text-sm gap-2 ${urgent ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {urgent && <Clock size={12} className="text-amber-500 shrink-0" />}
          <p className="font-medium text-gray-900 truncate">{b.customerName}</p>
        </div>
        <p className="text-gray-500 text-xs">{b.court?.name ?? '—'} · {b.startTime}–{b.endTime}</p>
      </div>
      <Badge label={BOOKING_STATUS_LABELS[b.status]} status={b.status} />
    </div>
  )
}

// ── Operator dashboard ────────────────────────────────────────────────────────

function OperatorDashboard() {
  const today = useMemo(() => toInputDate(new Date()), [])
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [activeCourts, setActiveCourts] = useState(0)
  const [upcomingTournaments, setUpcomingTournaments] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      bookingsApi.listBookings({ date: today }),
      courtsApi.listCourts({ active: true }),
      tournamentsApi.listTournaments(),
    ])
      .then(([bookings, courts, tournaments]) => {
        setTodayBookings(bookings)
        setActiveCourts(courts.length)
        setUpcomingTournaments(
          tournaments.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
        )
        setLastUpdated(new Date())
      })
      .catch(() => toast.error('Erro ao carregar dados do dashboard'))
      .finally(() => setLoading(false))
  }, [today])

  useEffect(() => { load() }, [load])

  const metrics = [
    { label: 'Agendamentos Hoje', value: todayBookings.length, icon: CalendarDays, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Quadras Ativas', value: activeCourts, icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Torneios Ativos', value: upcomingTournaments, icon: Trophy, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <RefreshBar loading={loading} lastUpdated={lastUpdated} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading
          ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
          : metrics.map((m) => (
            <Card key={m.label}>
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
          ))}
      </div>

      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Agendamentos Hoje</h2>
        {loading ? (
          <SkeletonRows />
        ) : todayBookings.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum agendamento hoje</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {todayBookings.map((b) => <BookingRow key={b.id} b={b} today={today} />)}
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Admin dashboard ───────────────────────────────────────────────────────────

function AdminDashboard() {
  const today = useMemo(() => toInputDate(new Date()), [])
  const tomorrow = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return toInputDate(d)
  }, [])
  const navigate = useNavigate()

  const monthStart = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  }, [])

  const [prevMonthStart, prevMonthEnd] = useMemo(() => {
    const s = new Date()
    s.setDate(1)
    s.setMonth(s.getMonth() - 1)
    const e = new Date()
    e.setDate(0)
    return [
      `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-01`,
      toInputDate(e),
    ]
  }, [])

  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [tomorrowBookings, setTomorrowBookings] = useState<Booking[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [prevSummary, setPrevSummary] = useState<FinancialSummary | null>(null)
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [activeCourts, setActiveCourts] = useState(0)
  const [upcomingTournaments, setUpcomingTournaments] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([])
  const [openOrders, setOpenOrders] = useState<BarOrder[]>([])
  const [topClients, setTopClients] = useState<{ customerName: string; total: number; orderCount: number }[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [
        bookingsRes, finRes, dailyRes, courtsRes, tournamentsRes,
        confirmedRes, ordersRes, topRes, prevFinRes, tomorrowRes, overdueRes,
      ] = await Promise.allSettled([
        bookingsApi.listBookings({ date: today }),
        financialApi.getSummary({ startDate: monthStart }),
        financialApi.getDailyRevenue({ days: 7 }),
        courtsApi.listCourts({ active: true }),
        tournamentsApi.listTournaments(),
        bookingsApi.listBookings({ status: 'CONFIRMED' }),
        barApi.listOrders('OPEN'),
        barApi.getTopClients(),
        financialApi.getSummary({ startDate: prevMonthStart, endDate: prevMonthEnd }),
        bookingsApi.listBookings({ date: tomorrow }),
        rentalsApi.getOverduePayments(),
      ])

      const get = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
        r.status === 'fulfilled' ? r.value : fallback

      setTodayBookings(get(bookingsRes, []))
      setSummary(get(finRes, null))
      setDailyRevenue(get(dailyRes, []))
      setActiveCourts(get(courtsRes, []).length)
      setUpcomingTournaments(
        get(tournamentsRes, []).filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
      )
      const confirmed = get(confirmedRes, [])
      setPendingBookings(confirmed.filter((b) => !b.payment || b.payment.status === 'PENDING').slice(0, 5))
      setOpenOrders(get(ordersRes, []))
      setTopClients(get(topRes, []) as { customerName: string; total: number; orderCount: number }[])
      setPrevSummary(get(prevFinRes, null))
      setTomorrowBookings(get(tomorrowRes, []))
      setOverduePayments(get(overdueRes, []))
      setLastUpdated(new Date())
    } catch {
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }, [today, tomorrow, monthStart, prevMonthStart, prevMonthEnd])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col gap-6">
      <RefreshBar loading={loading} lastUpdated={lastUpdated} />

      {/* Alerts strip */}
      {!loading && openOrders.length > 0 && (
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

      {/* Overdue rental payments alert */}
      {!loading && overduePayments.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl flex-wrap">
          <div className="flex items-center gap-1.5 shrink-0">
            <AlertTriangle size={14} className="text-red-500" />
            <span className="text-xs font-semibold text-red-700">
              {overduePayments.length} pagamento{overduePayments.length > 1 ? 's' : ''} de locação em atraso:
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap flex-1 min-w-0">
            {overduePayments.slice(0, 5).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate('/rentals')}
                className="flex items-center gap-1 px-2 py-0.5 bg-red-100 hover:bg-red-200 border border-red-300 rounded-full text-xs font-medium text-red-800 transition-colors whitespace-nowrap"
              >
                {p.rental.clientName} — {new Date(p.dueDate).toLocaleDateString('pt-BR')}
              </button>
            ))}
            {overduePayments.length > 5 && (
              <button
                onClick={() => navigate('/rentals')}
                className="px-2 py-0.5 bg-red-100 hover:bg-red-200 border border-red-300 rounded-full text-xs text-red-700 transition-colors"
              >
                +{overduePayments.length - 5} mais
              </button>
            )}
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          [0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <Card>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-orange-50 text-orange-600 rounded-xl p-2 sm:p-3 shrink-0">
                  <CalendarDays size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Agendamentos Hoje</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{todayBookings.length}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-green-50 text-green-600 rounded-xl p-2 sm:p-3 shrink-0">
                  <DollarSign size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Receita do Mês</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(summary?.received ?? 0)}</p>
                  {summary && prevSummary && (
                    <MoMBadge current={summary.received} previous={prevSummary.received} />
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-purple-50 text-purple-600 rounded-xl p-2 sm:p-3 shrink-0">
                  <MapPin size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Quadras Ativas</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{activeCourts}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-orange-50 text-orange-600 rounded-xl p-2 sm:p-3 shrink-0">
                  <Trophy size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Torneios Ativos</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{upcomingTournaments}</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Receita — Últimos 7 dias</h2>
          {loading ? (
            <div className="h-[200px] bg-gray-100 rounded-lg animate-pulse" />
          ) : dailyRevenue.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">Sem dados de receita</p>
          ) : (
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
          )}
        </Card>

        {/* Today's bookings */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Agendamentos Hoje</h2>
          {loading ? (
            <SkeletonRows />
          ) : todayBookings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum agendamento hoje</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {todayBookings.map((b) => <BookingRow key={b.id} b={b} today={today} />)}
            </div>
          )}
        </Card>
      </div>

      {/* Tomorrow's bookings */}
      {(loading || tomorrowBookings.length > 0) && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Agendamentos Amanhã
            {!loading && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                {tomorrowBookings.length}
              </span>
            )}
          </h2>
          {loading ? (
            <SkeletonRows n={2} />
          ) : (
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {tomorrowBookings.map((b) => (
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
      )}

      {/* Top clients */}
      {!loading && topClients.length > 0 && (
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

      {/* Pending payments */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Pendentes de Pagamento</h2>
        {loading ? (
          <SkeletonRows n={2} />
        ) : pendingBookings.length === 0 ? (
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
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <Layout title="Dashboard">
      {isAdmin ? <AdminDashboard /> : <OperatorDashboard />}
    </Layout>
  )
}
