import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, CalendarRange, Power, PowerOff, MapPin } from 'lucide-react'
import { formatCurrency } from '../../utils/format'
import toast from 'react-hot-toast'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DatePicker } from '../../components/ui/DatePicker'
import { RentalForm } from './RentalForm'
import type { Rental } from '../../types/rental'
import type { Court } from '../../types/court'
import type { RentalReport } from '../../api/rentals.api'
import * as rentalsApi from '../../api/rentals.api'
import * as courtsApi from '../../api/courts.api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Sum of all slot prices for a single occurrence
function rentalSlotRevenue(r: Rental): number {
  return r.slots.reduce((s, sl) => s + (Number(sl.price) || 0), 0)
}

function countWeekdayOccurrences(weekdays: number[], start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    if (weekdays.includes(cur.getDay())) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// Total value over the whole rental period (needs endDate)
function rentalTotalValue(r: Rental): number | null {
  if (!r.endDate) return null
  const start = new Date(r.startDate.slice(0, 10) + 'T00:00:00')
  const end = new Date(r.endDate.slice(0, 10) + 'T00:00:00')
  if (end < start) return 0
  return countWeekdayOccurrences(r.weekdays, start, end) * rentalSlotRevenue(r)
}

// Approx monthly value (slot revenue × weekday count × ~4.33 weeks)
function rentalMonthlyValue(r: Rental): number {
  return rentalSlotRevenue(r) * r.weekdays.length * 4.33
}

// Days until expiration; null when indefinite
function daysUntilExpiration(r: Rental): number | null {
  if (!r.endDate) return null
  const end = new Date(r.endDate.slice(0, 10) + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

function expirationLabel(r: Rental): { text: string; tone: 'gray' | 'green' | 'orange' | 'red' } {
  const days = daysUntilExpiration(r)
  if (days === null) return { text: 'Sem prazo definido', tone: 'gray' }
  if (days < 0) return { text: 'Expirada', tone: 'red' }
  if (days === 0) return { text: 'Expira hoje', tone: 'red' }
  if (days <= 7) return { text: `Expira em ${days} dia${days !== 1 ? 's' : ''}`, tone: 'orange' }
  return { text: `Expira em ${days} dias`, tone: 'green' }
}

export default function RentalsPage() {
  const [tab, setTab] = useState<'list' | 'report'>('list')
  const [rentals, setRentals] = useState<Rental[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Rental | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filterActive === 'all' ? {} : { active: filterActive === 'active' }
      setRentals(await rentalsApi.listRentals(params))
    } finally { setLoading(false) }
  }, [filterActive])

  useEffect(() => { load() }, [load])
  useEffect(() => { courtsApi.listCourts().then(setCourts) }, [])

  const filtered = search.trim()
    ? rentals.filter(r => r.clientName.toLowerCase().includes(search.toLowerCase()) || r.court?.name.toLowerCase().includes(search.toLowerCase()))
    : rentals

  async function handleToggleActive(rental: Rental) {
    try {
      await rentalsApi.updateRental(rental.id, { active: !rental.active })
      toast.success(rental.active ? 'Locação desativada' : 'Locação ativada')
      load()
    } catch { toast.error('Erro ao atualizar') }
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    try {
      await rentalsApi.deleteRental(selected.id)
      toast.success('Locação removida')
      setDeleteOpen(false)
      load()
    } catch { toast.error('Erro ao remover') }
    finally { setDeleting(false) }
  }

  return (
    <Layout title="Locação">
      <div className="flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1 border-b border-gray-200">
            {(['list', 'report'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'list' ? 'Locações' : 'Relatório'}
              </button>
            ))}
          </div>
          {tab === 'list' && (
            <Button onClick={() => { setSelected(null); setFormOpen(true) }}>
              <Plus size={16} /> Nova Locação
            </Button>
          )}
        </div>

        {tab === 'list' && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
                {(['all', 'active', 'inactive'] as const).map((f) => (
                  <button key={f} onClick={() => setFilterActive(f)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${filterActive === f ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} ${f !== 'all' ? 'border-l border-gray-200' : ''}`}
                  >
                    {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-40">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="text" placeholder="Buscar cliente ou quadra..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={<CalendarRange size={48} />} title="Nenhuma locação cadastrada" description="Cadastre locações recorrentes de quadras" action={{ label: 'Nova Locação', onClick: () => { setSelected(null); setFormOpen(true) } }} />
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((r) => {
                  const total = rentalTotalValue(r)
                  const exp = expirationLabel(r)
                  const toneClass =
                    exp.tone === 'red' ? 'bg-red-100 text-red-700'
                    : exp.tone === 'orange' ? 'bg-amber-100 text-amber-700'
                    : exp.tone === 'green' ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                  return (
                  <div key={r.id} className={`bg-white rounded-xl border px-5 py-3.5 ${r.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                    <div className="flex items-center gap-6">

                      {/* Col 1 — Cliente + Quadra */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">{r.clientName}</p>
                          <Badge label={r.active ? 'Ativo' : 'Inativo'} status={r.active ? 'active' : 'inactive'} />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{r.court?.name ?? 'Sem quadra definida'}</span>
                        </div>
                        {r.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{r.notes}</p>}
                      </div>

                      {/* Col 2 — Dias */}
                      <div className="shrink-0">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Dias</p>
                        <div className="flex gap-1 flex-wrap max-w-[160px]">
                          {r.weekdays.map(d => (
                            <span key={d} className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-md">{WEEKDAY_LABELS[d]}</span>
                          ))}
                        </div>
                      </div>

                      {/* Col 3 — Horários */}
                      <div className="shrink-0 min-w-[130px]">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Horários</p>
                        <div className="flex flex-col gap-0.5">
                          {r.slots.map((s, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs">
                              <span className="font-medium text-gray-700">{s.startTime}–{s.endTime}</span>
                              {s.price > 0 && <span className="text-green-700 font-semibold">{formatCurrency(s.price)}</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Col 4 — Valor / Expiração */}
                      <div className="shrink-0 min-w-[130px]">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Valor total</p>
                        {total !== null ? (
                          <p className="text-sm font-bold text-green-700">{formatCurrency(total)}</p>
                        ) : (
                          <p className="text-sm font-bold text-green-700">{formatCurrency(rentalMonthlyValue(r))}<span className="text-xs font-normal text-gray-400">/mês</span></p>
                        )}
                        <span className={`mt-1 inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${toneClass}`}>
                          {exp.text}
                        </span>
                      </div>

                      {/* Col 5 — Ações */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleToggleActive(r)} className={`p-1.5 rounded-lg transition-colors ${r.active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`} title={r.active ? 'Desativar' : 'Ativar'}>
                          {r.active ? <PowerOff size={15} /> : <Power size={15} />}
                        </button>
                        <button onClick={() => { setSelected(r); setFormOpen(true) }} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => { setSelected(r); setDeleteOpen(true) }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>

                    </div>
                  </div>
                )})}

              </div>
            )}
          </>
        )}

        {tab === 'report' && <RentalReportTab />}
      </div>

      <RentalForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={load} courts={courts} rental={selected ?? undefined} />

      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete}
        title="Remover locação" message={`Remover a locação de "${selected?.clientName}"${selected?.court ? ` em ${selected.court.name}` : ''}?`}
        confirmLabel="Remover" loading={deleting} />
    </Layout>
  )
}

function RentalReportTab() {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = `${today.slice(0, 7)}-01`

  const [startDate, setStartDate] = useState(monthStart)
  const [endDate, setEndDate] = useState(today)
  const [report, setReport] = useState<RentalReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await rentalsApi.getRentalReport({ startDate, endDate })
      setReport(data)
    } catch {
      toast.error('Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { load() }, [load])

  const weekdayData = report?.weekdayActivity.map(w => ({
    name: WEEKDAY_LABELS[w.weekday],
    locações: w.rentalCount,
  })) ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <DatePicker label="De" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
        <DatePicker label="Até" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
        <Button variant="secondary" onClick={load}>Filtrar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
      ) : !report ? null : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <p className="text-xs text-gray-500 mb-1">Locações Ativas</p>
              <p className="text-2xl font-bold text-green-700">{report.activeCount}</p>
            </Card>
            <Card>
              <p className="text-xs text-gray-500 mb-1">Locações Inativas</p>
              <p className="text-2xl font-bold text-gray-500">{report.inactiveCount}</p>
            </Card>
            <Card>
              <p className="text-xs text-gray-500 mb-1">Total de Locações</p>
              <p className="text-2xl font-bold text-gray-900">{report.totalCount}</p>
            </Card>
            <Card>
              <p className="text-xs text-gray-500 mb-1">Receita Estimada</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(report.estimatedRevenue)}</p>
              <p className="text-xs text-gray-400 mt-1">No período selecionado</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Top courts */}
            <Card>
              <h2 className="text-base font-semibold text-gray-900 mb-4">Quadras com mais locações</h2>
              {report.topCourts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {report.topCourts.map((court, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">
                          {i + 1}
                        </div>
                        <p className="text-sm font-medium text-gray-800 truncate">{court.courtName}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-sm">
                        <span className="text-gray-500">{court.rentalCount} locação{court.rentalCount !== 1 ? 'ções' : ''}</span>
                        <span className="font-semibold text-orange-600">{formatCurrency(court.estimatedRevenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Weekday activity chart */}
            <Card>
              <h2 className="text-base font-semibold text-gray-900 mb-4">Atividade por Dia da Semana</h2>
              {weekdayData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weekdayData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="locações" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
