import { useState, useEffect, useCallback } from 'react'
import { Plus, CalendarDays, List, Search, History, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { EmptyState } from '../../components/ui/EmptyState'
import { DatePicker } from '../../components/ui/DatePicker'
import { Select } from '../../components/ui/Select'
import { Spinner } from '../../components/ui/Spinner'
import { BookingForm } from './BookingForm'
import { BookingDetail } from './BookingDetail'
import { BookingsCalendar } from './BookingsCalendar'
import type { Booking } from '../../types/booking'
import type { Court } from '../../types/court'
import * as bookingsApi from '../../api/bookings.api'
import * as courtsApi from '../../api/courts.api'
import { formatCurrency, BOOKING_STATUS_LABELS } from '../../utils/format'
import { formatDate, toInputDate } from '../../utils/date'

type ViewMode = 'list' | 'calendar' | 'history'

function exportHistoryCSV(bookings: Booking[]) {
  const rows = [
    ['Data', 'Quadra', 'Cliente', 'Telefone', 'Início', 'Fim', 'Valor', 'Pagamento'],
    ...bookings.map((b) => [
      b.date,
      b.court?.name ?? '',
      b.customerName,
      b.customerPhone ?? '',
      b.startTime,
      b.endTime,
      Number(b.totalPrice).toFixed(2),
      b.payment?.status === 'PAID' ? 'Pago' : 'Pendente',
    ]),
  ]
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `historico-agendamentos.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function BookingsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<Booking | null>(null)

  // List filters
  const [filterDate, setFilterDate] = useState(toInputDate(new Date()))
  const [filterCourt, setFilterCourt] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')

  // History filters
  const [historySearch, setHistorySearch] = useState('')
  const [historyCourt, setHistoryCourt] = useState('')
  const [historyStartDate, setHistoryStartDate] = useState('')
  const [historyEndDate, setHistoryEndDate] = useState('')
  const [historyBookings, setHistoryBookings] = useState<Booking[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterDate) params.date = filterDate
      if (filterCourt) params.courtId = filterCourt
      if (filterStatus) params.status = filterStatus
      if (filterCustomer) params.customerName = filterCustomer
      setBookings(await bookingsApi.listBookings(params))
    } catch {
      toast.error('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }, [filterDate, filterCourt, filterStatus, filterCustomer])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const params: Record<string, string> = { status: 'COMPLETED' }
      if (historySearch) params.search = historySearch
      if (historyCourt) params.courtId = historyCourt
      if (historyStartDate) params.startDate = historyStartDate
      if (historyEndDate) params.endDate = historyEndDate
      const data = await bookingsApi.listBookings(params)
      // History shows only completed bookings that were paid
      setHistoryBookings(data.filter((b) => b.status === 'COMPLETED' && b.payment?.status === 'PAID'))
    } finally {
      setHistoryLoading(false)
    }
  }, [historySearch, historyCourt, historyStartDate, historyEndDate])

  useEffect(() => { courtsApi.listCourts().then(setCourts) }, [])
  useEffect(() => { if (viewMode === 'list') load() }, [load, viewMode])
  useEffect(() => { if (viewMode === 'history') loadHistory() }, [viewMode, loadHistory])

  function openDetail(booking: Booking) {
    setSelected(booking)
    setDetailOpen(true)
  }

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'CONFIRMED', label: 'Confirmado' },
    { value: 'COMPLETED', label: 'Concluído' },
    { value: 'CANCELLED', label: 'Cancelado' },
    { value: 'NO_SHOW', label: 'Não compareceu' },
  ]

  const columns = [
    {
      key: 'court',
      header: 'Quadra',
      cell: (b: Booking) => <span className="font-medium">{b.court?.name ?? '—'}</span>,
    },
    {
      key: 'customer',
      header: 'Cliente',
      cell: (b: Booking) => (
        <div>
          <p className="font-medium text-gray-900">{b.customerName}</p>
          <p className="text-xs text-gray-500">{b.customerPhone}</p>
        </div>
      ),
    },
    {
      key: 'datetime',
      header: 'Data / Hora',
      cell: (b: Booking) => (
        <div>
          <p>{formatDate(b.date)}</p>
          <p className="text-xs text-gray-500">{b.startTime} – {b.endTime}</p>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Valor',
      cell: (b: Booking) => <span className="font-medium">{formatCurrency(Number(b.totalPrice))}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (b: Booking) => <Badge label={BOOKING_STATUS_LABELS[b.status]} status={b.status} />,
    },
    {
      key: 'payment',
      header: 'Pgto',
      cell: (b: Booking) => (
        <Badge
          label={b.payment ? (b.payment.status === 'PAID' ? 'Pago' : 'Pendente') : '—'}
          status={b.payment?.status ?? 'gray'}
        />
      ),
    },
  ]

  return (
    <Layout title="Agendamentos">
      <div className="flex flex-col gap-6">
        {/* Toolbar */}
        <div className="flex items-end gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List size={15} /> Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${viewMode === 'calendar' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <CalendarDays size={15} /> Calendário
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${viewMode === 'history' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <History size={15} /> Histórico
            </button>
          </div>

          {viewMode === 'list' && (
            <>
              <div className="relative flex-1 min-w-36">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
                />
              </div>
              <div className="flex gap-1 shrink-0">
                {[
                  { label: 'Hoje', value: toInputDate(new Date()) },
                  { label: 'Amanhã', value: toInputDate(new Date(Date.now() + 86400000)) },
                  { label: 'Todos', value: '' },
                ].map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => setFilterDate(value)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterDate === value ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <DatePicker label="Data" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-36" />
              <Select
                label="Quadra"
                options={[{ value: '', label: 'Todas' }, ...courts.map((c) => ({ value: c.id, label: c.name }))]}
                value={filterCourt}
                onChange={(e) => setFilterCourt(e.target.value)}
                className="w-40"
              />
              <Select
                label="Status"
                options={statusOptions}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-40"
              />
            </>
          )}

          <div className={viewMode === 'calendar' ? '' : 'ml-auto shrink-0'}>
            <Button onClick={() => setFormOpen(true)}>
              <Plus size={16} /> Novo Agendamento
            </Button>
          </div>
        </div>

        {/* ── Lista ── */}
        {viewMode === 'list' && (
          bookings.length === 0 && !loading ? (
            <EmptyState
              icon={<CalendarDays size={48} />}
              title="Nenhum agendamento encontrado"
              description="Tente alterar os filtros ou crie um novo agendamento"
              action={{ label: 'Novo Agendamento', onClick: () => setFormOpen(true) }}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table
                columns={columns}
                data={bookings}
                keyExtractor={(b) => b.id}
                loading={loading}
                onRowClick={openDetail}
              />
            </div>
          )
        )}

        {/* ── Calendário ── */}
        {viewMode === 'calendar' && (
          <BookingsCalendar courts={courts.filter((c) => c.active)} onBookingClick={openDetail} />
        )}

        {/* ── Histórico ── */}
        {viewMode === 'history' && (
          <div className="flex flex-col gap-4">
            {/* History filters */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 flex-wrap items-end">
                <div className="relative flex-1 min-w-48">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, telefone..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
                  />
                </div>
                <Select
                  label="Quadra"
                  options={[{ value: '', label: 'Todas' }, ...courts.map((c) => ({ value: c.id, label: c.name }))]}
                  value={historyCourt}
                  onChange={(e) => setHistoryCourt(e.target.value)}
                  className="w-40"
                />
                <DatePicker label="De" value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} className="w-36" />
                <DatePicker label="Até" value={historyEndDate} onChange={(e) => setHistoryEndDate(e.target.value)} className="w-36" />
              </div>
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
            ) : historyBookings.length === 0 ? (
              <EmptyState
                icon={<History size={48} />}
                title="Nenhum agendamento no histórico"
                description="Tente ajustar os filtros de busca"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table
                  columns={[
                    ...columns,
                    {
                      key: 'valor',
                      header: 'Valor',
                      cell: (b: Booking) => <span className="font-medium">{formatCurrency(Number(b.totalPrice))}</span>,
                    },
                  ].filter((c, i, arr) => arr.findIndex(x => x.key === c.key) === i)}
                  data={historyBookings}
                  keyExtractor={(b) => b.id}
                  onRowClick={openDetail}
                />
              </div>
            )}

            {!historyLoading && historyBookings.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {historyBookings.length} agendamento{historyBookings.length !== 1 ? 's' : ''} encontrado{historyBookings.length !== 1 ? 's' : ''}
                </p>
                <Button variant="secondary" onClick={() => exportHistoryCSV(historyBookings)}>
                  <Download size={14} /> Exportar CSV
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <BookingForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={load} courts={courts} />

      {selected && (
        <BookingDetail
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          booking={selected}
          onSuccess={() => { load(); loadHistory(); setDetailOpen(false) }}
        />
      )}
    </Layout>
  )
}
