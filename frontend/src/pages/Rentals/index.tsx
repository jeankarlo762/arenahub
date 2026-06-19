import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, CalendarRange, Power, PowerOff, MapPin } from 'lucide-react'
import { formatCurrency } from '../../utils/format'
import { WEEKDAY_LABELS } from '../../utils/date'
import toast from 'react-hot-toast'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { RentalForm } from './RentalForm'
import type { Rental } from '../../types/rental'
import type { Court } from '../../types/court'
import * as rentalsApi from '../../api/rentals.api'
import * as courtsApi from '../../api/courts.api'

export default function RentalsPage() {
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
      toast.success(rental.active ? 'Aluguel desativado' : 'Aluguel ativado')
      load()
    } catch { toast.error('Erro ao atualizar') }
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    try {
      await rentalsApi.deleteRental(selected.id)
      toast.success('Aluguel removido')
      setDeleteOpen(false)
      load()
    } catch { toast.error('Erro ao remover') }
    finally { setDeleting(false) }
  }

  return (
    <Layout title="Aluguéis">
      <div className="flex flex-col gap-6">
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
          <Button onClick={() => { setSelected(null); setFormOpen(true) }}><Plus size={16} /> Novo Aluguel</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<CalendarRange size={48} />} title="Nenhum aluguel cadastrado" description="Cadastre aluguéis recorrentes de quadras" action={{ label: 'Novo Aluguel', onClick: () => { setSelected(null); setFormOpen(true) } }} />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((r) => (
              <div key={r.id} className={`bg-white rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${r.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{r.clientName}</p>
                    <Badge label={r.active ? 'Ativo' : 'Inativo'} status={r.active ? 'active' : 'inactive'} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                    <MapPin size={11} className="shrink-0" />
                    <span>{r.court?.name ?? 'Sem quadra definida'}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap mb-2">
                    {r.weekdays.map(d => (
                      <span key={d} className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">{WEEKDAY_LABELS[d]}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {r.slots.map((s, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        {s.startTime}–{s.endTime}
                        {s.price > 0 && <span className="text-green-700 font-semibold ml-0.5">{formatCurrency(s.price)}</span>}
                      </span>
                    ))}
                  </div>
                  {r.notes && <p className="text-xs text-gray-400 mt-1">{r.notes}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
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
            ))}
          </div>
        )}
      </div>

      <RentalForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={load} courts={courts} rental={selected ?? undefined} />

      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete}
        title="Remover aluguel" message={`Remover o aluguel de "${selected?.clientName}"${selected?.court ? ` em ${selected.court.name}` : ''}?`}
        confirmLabel="Remover" loading={deleting} />
    </Layout>
  )
}
